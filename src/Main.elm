
import Game
import Current

import StartApp
import Task exposing (Task)
import Effects exposing (Never)
import Html exposing (Html)
import Random

app : StartApp.App Game.Model
app =
  StartApp.start
    { view = Game.view
    , update = Game.update
    , init = Game.init (Random.initialSeed (floor (Current.time ())))
    , inputs = []
    }

main : Signal Html
main =
  app.html

port tasks : Signal (Task Never ())
port tasks =
  app.tasks
