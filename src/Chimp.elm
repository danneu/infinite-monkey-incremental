
module Chimp where

import Words
import Belt

import Time exposing (Time)
import Html exposing (..)
import Html.Attributes exposing (..)
import Html.Events exposing (onClick)
import String
import Signal exposing (Address)
import Random
import Char
import Regex

-- MODEL

type alias Model =
  { register : List Char
  , interval : Time
  , prevBeat : Maybe Time
  , seed : Random.Seed
  , latestWords : List String
  , speed : Int
  , latestWord : Maybe String
  , wordCount : Int
  , cashTotal : Int
  }

init : Random.Seed -> Int -> Model
init seed speed =
  let
    interval = speedToInterval speed
  in
    { register = List.repeat 15 '_'
    , interval = interval
    , prevBeat = Nothing
    , seed = seed
    , latestWords = []
    , speed = speed
    , latestWord = Nothing
    , wordCount = 0
    , cashTotal = 0
    }

-- UPDATE

type Action
  = Beat Time
  | IncSpeed

update : Action -> Model -> Model
update action model =
  case action of
    IncSpeed ->
      if (model.speed + 1) > 10 then
        model
      else
        let
          newSpeed = model.speed + 1
          newInterval = speedToInterval newSpeed
        in
          { model | speed = newSpeed
                  , interval = newInterval
          }
    Beat now ->
      case model.prevBeat of
        Nothing ->
          { model | prevBeat = Just now }
        Just prev ->
          if now - prev > model.interval then
            let
              (char, nextSeed) = generateChar model.seed
              -- : List Char
              nextRegister =
                if List.length model.register == 15 then
                  List.append ((List.drop 1) model.register) [char]
                else
                  List.append model.register [char]
              -- : Maybe String
              detectedWord = detectWord (String.fromList model.register)
              -- : List String
              nextLatestWords = case detectedWord of
                                  Nothing ->
                                    model.latestWords
                                  Just word ->
                                    word :: model.latestWords
              nextWordCount = case detectedWord of
                                Nothing -> model.wordCount
                                Just _ -> model.wordCount + 1
              nextLatestWord = case detectedWord of
                                 Nothing -> model.latestWord
                                 Just word -> Just word
              nextCashTotal = case detectedWord of
                                Nothing -> model.cashTotal
                                Just word -> model.cashTotal + Belt.scoreWord word

            in
              { model | prevBeat = Just (prev + model.interval)
                      , register = nextRegister
                      , seed = nextSeed
                      , latestWords = nextLatestWords
                      , latestWord = nextLatestWord
                      , wordCount = nextWordCount
                      , cashTotal = nextCashTotal
              }
          else
            model

type alias Context =
  { actions : Signal.Address Action
  , incSpeed : Signal.Address ()
  }

view : Context -> Int -> Model -> Html
view ctx cash model =
  div
  [ class "panel panel-default col-md-3 col-sm-4 col-xs-6" ]
  [ div
    [ class "panel-body" ]
    [ p
      []
      [ code
        []
        [ text <| String.fromList model.register]
      , img
        [ src "public/img/monkey.gif" ]
        []
      ]
    , ul
      [ class "list-unstyled" ]
      [ li
        []
        [ text <| "Speed: " ++ (toString model.speed) ++ " "
        , let
            -- : Int
            speedPrice = Belt.calcSpeedPrice model.speed
            -- : Bool
            canAffordSpeed = cash >= speedPrice
          in
          button
          [ onClick ctx.incSpeed ()
          , classList [ "btn" => True,
                        "disabled" => (model.speed == 10),
                        "btn-success" => canAffordSpeed,
                        "btn-default" => not canAffordSpeed,
                        "btn-xs" => True
                      ]
          , disabled (not canAffordSpeed)
          ]
          [ let
              cost = if model.speed == 10 then
                       "Max"
                     else
                       "$" ++ (toString speedPrice)
            in
              text ("Upgrade (" ++ cost ++ ")")
          ]
        ]
      , li [] [ text <| "Words: " ++ (toString model.wordCount) ]
      , li
        []
        [ span
          []
          [ text "Latest Word: " ]
        , code
          []
          [ text <| Maybe.withDefault "--" model.latestWord ]
        ]
      , li
        []
        [ text <| "Cash Generated: $" ++ (toString model.cashTotal)]
      ]
    ]
  ]

-- HELPERS

generateChar : Random.Seed -> (Char, Random.Seed)
generateChar seed =
  let
    gen = Random.int 97 122
    (charCode, nextSeed) = Random.generate gen seed
  in
    (Char.fromCode charCode, nextSeed)

-- http://www.mieliestronk.com/wordlist.html
-- wordlist source: http://www.mieliestronk.com/corncob_lowercase.txt
detectWord : String -> Maybe String
detectWord register =
  let
    -- NOTE: Due to apparent laziness, Elm will wait til this is called the first
    -- time (i.e. when first monkey spawns) before loading the massive
    -- Words.re regex, so the first monkey spawn hangs the UI for a second or
    -- few.
    matches = Regex.find (Regex.AtMost 1) Words.re register
  in
    case List.head matches of
      Nothing ->
        Nothing
      Just match ->
        Just match.match


speedToInterval : Int -> Time
speedToInterval speed =
  (500 - ((toFloat speed)-1)*50) * Time.millisecond

(=>) : a -> b -> (a, b)
(=>) = (,)
