Elm.Native.Current = {};
Elm.Native.Current.make = function(localRuntime) {

  localRuntime.Native = localRuntime.Native || {};
  localRuntime.Native.Current = localRuntime.Native.Current || {};

  if (localRuntime.Native.Current.values) {
    return localRuntime.Native.Current.values;
  }

  function time() {
    return new Date().getTime();
  }

  function date() {
    return new Date();
  }

  return localRuntime.Native.Current.values = {
    time: time,
    date: date,
  };
};
