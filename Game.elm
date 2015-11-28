
module Game where

import Chimp
import Belt

import Effects exposing (Effects)
import Time exposing (Time)
import Html exposing (..)
import Html.Events exposing (..)
import Html.Attributes exposing (..)
import Signal exposing (Address)
import Random

type alias Id = Int
type alias Model =
  { chimps : List (Id, Chimp.Model)
  , nextId : Id
  , seed : Random.Seed
  , score : Int
  , cash : Int
  }

type Action
  = Beat Time
  | BuyChimp
  | Modify Id Chimp.Action

init : (Model, Effects Action)
init =
  ( { chimps = []
    , nextId = 1
    , seed = Random.initialSeed 42
    , score = 0
    , cash = 4000 -- enough to buy first monkey
    }
  , Effects.tick Beat
  )

generateChimpSeed : Random.Seed -> (Int, Random.Seed)
generateChimpSeed seed =
  let
    gen = Random.int Random.minInt Random.maxInt
  in
    Random.generate gen seed

update : Action -> Model -> (Model, Effects Action)
update action model =
  case action of
    Modify id chimpAction ->
      let
        updateChimp (chimpId, chimpModel) =
          if (id == chimpId) then
            (chimpId, Chimp.update chimpAction chimpModel)
          else
            (chimpId, chimpModel)
        newChimps = List.map updateChimp model.chimps
      in
        ({ model | chimps = newChimps }
        , Effects.none
        )
    BuyChimp ->
      let
        (chimpSeed, nextSeed) = generateChimpSeed model.seed
        chimpModel = Chimp.init (Random.initialSeed chimpSeed)
        nextModel =
          { model | nextId = model.nextId + 1
                  , chimps = List.append model.chimps [(model.nextId, chimpModel)]
                  , seed = nextSeed
                  , cash = model.cash - (Belt.calcMonkeyPrice << List.length) model.chimps
          }
      in
        ( nextModel
        , Effects.none)
    Beat now ->
      let
        updateChimp (id, chimpModel) =
          (id, Chimp.update (Chimp.Beat now) chimpModel)
        newChimps = List.map updateChimp model.chimps

        reducer ((_, oldModel), (_, newModel)) memo =
          if oldModel.wordCount < newModel.wordCount then
            case List.head newModel.latestWords of
              Nothing -> memo
              Just word -> word :: memo
          else
            memo
        newWords = (List.map2 (,) model.chimps newChimps)
                   |> List.foldl reducer []
        beatScore = List.foldl (\word score -> score + Belt.scoreWord word) 0 newWords
      in
        ({ model | chimps = newChimps
                 , score = model.score + beatScore
                 , cash = model.cash + beatScore
         }
        , Effects.tick Beat
        )

viewChimp : Address Action -> (Id, Chimp.Model) -> Html
viewChimp address (id, model) =
  Chimp.view (Signal.forwardTo address (Modify id)) model

view : Address Action -> Model -> Html
view address model =
  div
  [ class "container" ]
  [ h1 [ class "text-center" ] [ text "Infinite Monkey Incremental" ]
  , blockquote
    [ class "lead" ]
    [ text "The "
    , a
      [ href "https://en.wikipedia.org/wiki/Infinite_monkey_theorem"
      , target "_blank"
      ]
      [ strong [] [ text "infinite monkey theorem" ] ]
    , text " states that a monkey hitting keys at random on a typewriter for an infinite amount of time will almost surely type a given text, such as the complete works of William Shakespeare." ]
  , div
    [ style [ "margin-bottom" => "20px" ] ]
    [ button
      [ onClick address BuyChimp
      , class "btn btn-success"
      ]
      [ text <| "Buy Chimp ($" ++ (toString << Belt.calcMonkeyPrice << List.length) model.chimps ++ ")" ]
    , ul
      [ class "list-inline lead pull-right" ]
      [ li
        []
        [ strong [] [ text "Cash: " ]
        , text (toString model.cash)
        ]
      , li
        []
        [ strong [] [ text "Score: " ]
        , text (toString model.score)
        ]
      ]
    ]
  , div
    []
    ( if List.isEmpty model.chimps then
        [ div
          [ class "well" ]
          [ p
            [ class "lead text-center" ]
            [ text "Buy your first monkey to get the ball rolling" ]
          ]
        ]
      else
        [ div
          [ class "row"
          , style [ "margin-left" => "0px"
                  , "margin-right" => "0px"
                  ]
          ]
          (List.map (viewChimp address) model.chimps)
        ]
    )
  , footer
    [ style [ "margin-top" => "100px"
            , "text-align" => "center"
            , "clear" => "both"
            ]
    ]
    [ p
      []
      [ text "Source code at "
      , a
        [ href "https://github.com/danneu/infinite-monkey-incremental" ]
        [ text "danneu/infinite-monkey-incremental" ]
      ]
    ]
  ]

(=>) : a -> b -> (a, b)
(=>) = (,)
