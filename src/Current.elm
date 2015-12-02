
module Current where

import Native.Current

import Time exposing (Time)
import Date exposing (Date)

-- milliseconds since epoch
time : () -> Time
time _ =
  Native.Current.time ()

date : () -> Date
date _ =
  Native.Current.date ()
