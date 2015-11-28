
module Belt where

import String

scoreWord : String -> Int
scoreWord word =
  2 ^ (String.length word)

priceFormula : Int -> Float -> Int -> Int
priceFormula base ratio count =
  let
    base' = toFloat base
    count' = toFloat count
  in
    if ratio == 1 then
      floor <| base' * count'
    else
      floor <| base' - base' * (ratio ^ count') / (1 - ratio)


calcMonkeyPrice : Int -> Int
calcMonkeyPrice =
  priceFormula 20 2.0

-- TODO: scale with global speed upgrade count rather than per chimp
-- input: currSpeed
calcSpeedPrice : Int -> Int
calcSpeedPrice =
  priceFormula 5 1.5
