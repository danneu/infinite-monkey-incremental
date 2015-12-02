
module Book where

import Html exposing (..)
--import Html.Events exposing (..)
import Html.Attributes exposing (..)
import Html.Lazy exposing(..)
import String

-- MODEL

type alias Page =
  { words : List String
  , pageNum : Int
  }

initPage : Int -> List String -> Page
initPage pageNum words =
  { words = words
  , pageNum = pageNum
  }

type alias Model =
  { left : Page
  , right : Page
  , wordsPerPage : Int
  }

init : Int -> Model
init wordsPerPage =
  { left = initPage 1 []
  , right = initPage 2 []
  , wordsPerPage = wordsPerPage
  }

-- UPDATE

type Action = AddWord String

update : Action -> Model -> Model
update action model =
  case action of
    AddWord word ->
      if List.length model.left.words < model.wordsPerPage then
        let
          oldLeft = model.left
        in
          { model | left = { oldLeft | words = List.append oldLeft.words [word] } }
      else if List.length model.right.words < model.wordsPerPage then
        let
          oldRight = model.right
        in
          { model | right = { oldRight | words = List.append oldRight.words [word] } }
      else -- both pages full
        let
          newLeftPageNum = model.left.pageNum + 1
          newRightPageNum = model.right.pageNum + 1
          newRightPage = initPage newRightPageNum []
          newLeftPage = initPage newLeftPageNum [word]
        in
          { model | left = newLeftPage
                  , right = newRightPage
          }

-- VIEW

viewPage : Bool -> Page -> Html
viewPage isLeft page =
  div
  []
  [ div
    [ style [ "height" => "100px" ] ]
    [ text <| String.join " " page.words ]
  , div
    [ class (if isLeft then "text-left" else "text-right") ]
    [ text <| "Page " ++ (toString page.pageNum) ]
  ]

view : Model -> Html
view model =
  div
  [ class "panel panel-default"
  , style [ "font-family" => "serif" ]
  ]
  [ div
    [ class "panel-body" ]
    [ div
      [ class "row" ]
      [ div
        [ class "col-lg-6" ]
        [ (lazy2 viewPage True model.left) ]
      , div
        [ class "col-lg-6"
        , style [ "border-left" => "1px solid #ccc" ]
        ]
        [ (lazy2 viewPage False model.right) ]
      ]
    ]
  ]


(=>) : a -> b -> (a, b)
(=>) = (,)
