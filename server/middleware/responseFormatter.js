/**
 * Ensure requestId is included in JSON responses.
 * Patches res.json to add requestId when present.
 */
function responseFormatter(req, res, next) {
  const origJson = res.json.bind(res);
  res.json = function (body) {
    if (req.requestId && body && typeof body === "object" && !res.headersSent) {
      body.requestId = body.requestId ?? req.requestId;
    }
    return origJson(body);
  };
  next();
}

module.exports = responseFormatter;
