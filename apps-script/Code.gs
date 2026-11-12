/**
 * Kindle Dashboard bridge (lives inside the "Kindle Dashboard" Google Sheet).
 *
 *   Data!A1     <- Claude writes the dashboard info here (JSON) at each check-in
 *   Actions tab <- every tap / reply / note from the Kindle lands here as a row
 *
 * The Kindle page calls this web app:
 *   GET  ?op=data&key=CODE   -> returns Data!A1
 *   GET  ?op=ping&key=CODE   -> checks the code
 *   POST {key, op:"action", action:{...}} -> appends a row to Actions
 *
 * Setup (once):
 *   1. Run setup() and allow access. Your 8-letter Kindle code appears in the log.
 *   2. Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone.
 *   3. Copy the Web app URL and give it to Claude.
 */

var SHEET_ID = "1jZJfEdeyIH0o0dWWDJu7VzhtjRA4FzkixWw4ypde67Q";
var HEADERS = ["id", "at", "box", "itemId", "item", "from", "action", "text", "undoes"];

function setup() {
  var props = PropertiesService.getScriptProperties();
  var key = props.getProperty("KEY");
  if (!key) {
    var chars = "abcdefghjkmnpqrstuvwxyz23456789";
    key = "";
    for (var i = 0; i < 8; i++) key += chars.charAt(Math.floor(Math.random() * chars.length));
    props.setProperty("KEY", key);
  }
  actions_();
  Logger.log("Your Kindle code is:  " + key);
}

function doGet(e) {
  if (!authed_(e.parameter.key)) return json_({ error: "bad code" });
  var op = e.parameter.op || "data";
  if (op === "ping") return json_({ ok: true });
  if (op === "data") {
    var raw = ss_().getSheetByName("Data").getRange("A1").getValue();
    if (!raw) return json_({ error: "no data yet" });
    return ContentService.createTextOutput(String(raw)).setMimeType(ContentService.MimeType.JSON);
  }
  return json_({ error: "unknown op" });
}

function doPost(e) {
  var body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json_({ error: "bad json" }); }
  if (!authed_(body.key)) return json_({ error: "bad code" });
  if (body.op === "action" && body.action) {
    var a = body.action;
    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      actions_().appendRow(HEADERS.map(function (h) { return a[h] == null ? "" : String(a[h]); }));
    } finally {
      lock.releaseLock();
    }
    return json_({ ok: true, id: a.id });
  }
  return json_({ error: "unknown op" });
}

function ss_() { return SpreadsheetApp.openById(SHEET_ID); }

function actions_() {
  var sh = ss_().getSheetByName("Actions") || ss_().insertSheet("Actions");
  if (sh.getLastRow() === 0) sh.appendRow(HEADERS);
  return sh;
}

function authed_(k) {
  var key = PropertiesService.getScriptProperties().getProperty("KEY");
  return !!key && !!k && String(k).toLowerCase().trim() === key;
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
