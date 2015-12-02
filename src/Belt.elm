
module Belt where

import String
import Regex exposing (regex)

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

{- Formats an integer with commas

    commafy 123 == "123"
    commafy 1234 == "1,234"
    commafy 1234567890 == "1,234,567,890"
-}
commafy : Int -> String
commafy n =
  let
    re = regex "(\\d)(?=(\\d\\d\\d)+(?!\\d))"
    -- : Regex.Match -> String
    replacer match =
      case List.head match.submatches of
        Nothing -> ""
        Just x ->
          case x of
            Nothing -> ""
            Just y -> y ++ ","
  in
    Regex.replace Regex.All re replacer (toString n)
