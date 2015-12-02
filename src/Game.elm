
module Game where

import Chimp
import Belt
import Book

import Effects exposing (Effects)
import Time exposing (Time)
import Html exposing (..)
import Html.Events exposing (..)
import Html.Attributes exposing (..)
import Html.Lazy exposing(..)
import Signal exposing (Address)
import Random
import Debug

type alias Id = Int
type alias Model =
  { chimps : List (Id, Chimp.Model)
  , nextId : Id
  , seed : Random.Seed
  , score : Int
  , cash : Int
  , book : Book.Model
  }

type Action
  = Beat Time
  | BuyChimp
  | Modify Id Chimp.Action
  | IncSpeed Id

init : Random.Seed -> (Model, Effects Action)
init seed =
  ( { chimps = []
    , nextId = 1
    , seed = seed
    , score = 0
      -- start player with enough cash for a few monkeys
      -- to avoid immediate boredom
    , cash = 20000
    , book = Book.init 50
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
    -- Increase a monkey's speed by one
    -- It's managed in this component since this component
    -- manages the player's total cash
    IncSpeed id ->
      let
        priceReducer (chimpId, chimpModel) price =
          if id == chimpId then
            Belt.calcSpeedPrice chimpModel.speed
          else
            price
        speedPrice = List.foldl priceReducer 0 model.chimps
      in
      -- ensure user can afford the upgrade, first
      if model.cash < speedPrice then
        (model, Effects.none)
      else
      let
        updateChimp (chimpId, chimpModel) =
          if (id == chimpId) then
            (chimpId, Chimp.update Chimp.IncSpeed chimpModel)
          else
            (chimpId, chimpModel)
        newChimps = List.map updateChimp model.chimps

      in
        ({ model | chimps = newChimps
                 , cash = model.cash - speedPrice
         }
        , Effects.none
        )
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
        monkeyPrice = Belt.calcMonkeyPrice << List.length <| model.chimps
      in
      -- ensure user can afford the upgrade, first
      if model.cash < monkeyPrice then
        (model, Effects.none)
      else
      let
        (chimpSeed, nextSeed) = generateChimpSeed model.seed
        -- Start at init speed of 5 to make things more immediately interesting
        chimpModel = Chimp.init (Random.initialSeed chimpSeed) 5
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
              Just word -> List.append memo [word]
          else
            memo
        newWords = (List.map2 (,) model.chimps newChimps)
                   |> List.foldl reducer []
        newBook = if List.length newWords > 0 then
                    Book.update
                      (Book.AddWord (Maybe.withDefault "" (List.head newWords)))
                      model.book
                  else
                    model.book
        beatScore = List.foldl (\word score -> score + Belt.scoreWord word) 0 newWords
      in
        ({ model | chimps = newChimps
                 , score = model.score + beatScore
                 , cash = model.cash + beatScore
                 , book = newBook
         }
        , Effects.tick Beat
        )

-- Need to pass total cash into each monkey view
-- so they know when their "Upgrade" buttons are affordable
-- and thus clickable
viewChimp : Address Action -> Int -> (Id, Chimp.Model) -> Html
viewChimp address cash (id, model) =
  let
    ctx = { actions = Signal.forwardTo address (Modify id)
          , incSpeed = Signal.forwardTo address (always (IncSpeed id))
          }
  in
    Chimp.view ctx cash model

view : Address Action -> Model -> Html
view address model =
  let
    _ = Debug.log "rendering root view" ()
  in
  div
  [ class "container" ]
  [ h1
    [ class "text-center"
    , style [ "margin-top" => "100px" ]
    ]
    [ text "Infinite Monkey Incremental"
    , br [] []
    , small [] [ text "(Work in progress)" ]
    ]
  , blockquote
    [ class "lead" ]
    [ text "The "
    , a
      [ href "https://en.wikipedia.org/wiki/Infinite_monkey_theorem"
      , target "_blank"
      ]
      [ strong [] [ text "infinite monkey theorem" ] ]
    , text " states that a monkey hitting keys at random on a typewriter for an infinite amount of time will almost surely type a given text, such as the complete works of William Shakespeare." ]

    -- DISPLAY BOOK
  , div
    [ class "row" ]
    [ div
      [ class "col-lg-8 col-lg-offset-2" ]
      [ (lazy Book.view model.book) ]
    ]

    -- MONKEY SECTION
  , div
    [ style [ "margin-bottom" => "20px" ] ]
    [ button
      [ onClick address BuyChimp
      , class "btn btn-success"
      , disabled (model.cash < (Belt.calcMonkeyPrice << List.length <| model.chimps))
      ]
      [ text <| "Buy Chimp ($" ++ (toString << Belt.calcMonkeyPrice << List.length) model.chimps ++ ")" ]
    , ul
      [ class "list-inline lead pull-right" ]
      [ li
        []
        [ strong [] [ text "Cash: " ]
        , text ("$" ++ (Belt.commafy model.cash))
        ]
      , li
        []
        [ strong [] [ text "Score: " ]
        , text (Belt.commafy model.score)
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
          (List.map (lazy3 viewChimp address model.cash) model.chimps)
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
        [ href "https://github.com/danneu/infinite-monkey-incremental"
        , target "_blank"
        ]
        [ text "danneu/infinite-monkey-incremental" ]
      ]
    ]
  ]

(=>) : a -> b -> (a, b)
(=>) = (,)
