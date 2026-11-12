/**
 * Kindle Dashboard bridge.
 *
 * The Kindle page calls this web app to:
 *   GET  ?op=data&key=...   -> newest dashboard info Claude saved in Drive
 *   POST {key, op:"action", action:{...}}  -> saves a tap/reply into the Actions sheet
 *
 * Claude writes a new "kindle-dashboard-data.json" into the "Kindle Dashboard"
 * folder at each check-in and reads the "Kindle Dashboard Actions" sheet.
 *
 * Setup: run setup() once, then Deploy > New deployment > Web app,
 * Execute as: Me, Who has access: Anyone.
 */

var FOLDER_NAME = "Kindle Dashboard";
var DATA_NAME = "kindle-dashboard-data.json";
var SHEET_NAME = "Kindle Dashboard Actions";
var HEADERS = ["id", "at", "box", "itemId", "item", "from", "action", "text", "undoes"];

function setup() {
  var props = PropertiesService.getScriptProperties();
  var key = props.getProperty("KEY");
  if (!key) {
    var chars = "abcdefghjkmnpqrstuvwxyz23456789", k = "";
    for (var i = 0; i < 8; i++) k += chars.charAt(Math.floor(Math.random() * chars.length));
    key = k;
    props.setProperty("KEY", key);
  }
  folder_();
  sheet_();
  Logger.log("Your Kindle code is:  " + key + "   (type this on the Kindle the first time)");
}

function doGet(e) {
  if (!authed_(e.parameter.key)) return json_({ error: "bad code" });
  var op = e.parameter.op || "data";
  if (op === "data") {
    var f = newestData_();
    if (!f) return json_({ error: "no data yet" });
    var data = JSON.parse(f.getBlob().getDataAsString());
    return json_(data);
  }
  if (op === "ping") return json_({ ok: true });
  return json_({ error: "unknown op" });
}

function doPost(e) {
  var body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json_({ error: "bad json" }); }
  if (!authed_(body.key)) return json_({ error: "bad code" });
  if (body.op === "action" && body.action) {
    var a = body.action, sh = sheet_();
    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      sh.appendRow(HEADERS.map(function (h) { return a[h] == null ? "" : String(a[h]); }));
    } finally {
      lock.releaseLock();
    }
    return json_({ ok: true, id: a.id });
  }
  return json_({ error: "unknown op" });
}

function authed_(k) {
  var key = PropertiesService.getScriptProperties().getProperty("KEY");
  return key && k && String(k).toLowerCase().trim() === key;
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function folder_() {
  var it = DriveApp.getFoldersByName(FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
}

function sheet_() {
  var it = folder_().getFilesByName(SHEET_NAME), ss;
  if (it.hasNext()) ss = SpreadsheetApp.open(it.next());
  else {
    ss = SpreadsheetApp.create(SHEET_NAME);
    DriveApp.getFileById(ss.getId()).moveTo(folder_());
  }
  var sh = ss.getSheets()[0];
  if (sh.getLastRow() === 0) sh.appendRow(HEADERS);
  return sh;
}

/** Newest data file wins; older copies are moved to the trash. */
function newestData_() {
  var it = folder_().getFilesByName(DATA_NAME), files = [];
  while (it.hasNext()) files.push(it.next());
  if (!files.length) return null;
  files.sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); });
  for (var i = 1; i < files.length; i++) {
    try { files[i].setTrashed(true); } catch (err) {}
  }
  return files[0];
}
