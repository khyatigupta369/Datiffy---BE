exports.getDate = function () {
    const today = new Date();
    return today.toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };