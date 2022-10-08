function checkQueryFor(strArray) {
  return checkFor("query", strArray);
}

function checkBodyFor(strArray) {
  return checkFor("body", strArray);
}

function checkFor(objName, strArray) {
  return function (req, res, next) {
    const missing = strArray.filter((str) => !req[objName].hasOwnProperty(str));
    if (missing.length) {
      return res.status(400).json({
        error: `MISSING_${objName.toUpperCase()}_PARAMETERS`,
        errorMessage: `${capitalize(
          objName
        )} parameter(s) missing: ${missing.join(", ")}`,
      });
    }
    return next();
  };
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = {
  checkQueryFor,
  checkBodyFor,
};
