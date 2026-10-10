/* ميزان — القياس ومحرّك السعر · مشتركٌ بين كل الصفحات
   الإصدار ٢ (١٠/١٠/٢٠٢٦): السعر قبل بيانات التواصل · أحداث قياس مفصولة برموز جديدة
   (P1 P2 F1 F2 F3 F4 PV C1 C2 L1 E8) مع الإبقاء على E1–E7 · علامة التجربة · الأرقام العربية.
   تعريفات الأحداث في ملف «تعريفات القياس» المرفق مع نسخة الرفع. */
(function () {
"use strict";

/* ====== الإعدادات ====== */
var SHEET = "https://script.google.com/macros/s/AKfycby1EDGFx7SjpAY2JXQixneO8knh9iNEZszsOGFNDn7YF886qOvs64r-ni4QPL1P_fwV/exec";
var MAIL  = "https://formsubmit.co/mizanverify.contact@gmail.com";
var SITE  = "https://mizanplatform.github.io";

/* ====== أسعار الاختبار — MZ-WTP · لا تُغيَّر أثناء الاختبار ====== */
var LEGAL_PRICE = 7500;
var ENG_VISIT   = 2000;
var ENG_RATE    = 50;
var EXT_VISIT   = 800;
var EXT_RATE    = 20;
var OUT_OF_SCOPE = ["وحدة إدارية", "وحدة تجارية"];

var SHOW_VAT = false;
var VAT_RATE = 0.14;
function withVat(p){ return Math.round(p * (1 + VAT_RATE)); }
function engPrice(built, ext){
  var p = ENG_VISIT + ENG_RATE * built;
  if (ext > 0) p += EXT_VISIT + EXT_RATE * ext;
  return Math.round(p);
}

/* ====== أرقام عربية ====== */
var AR = ["٠","١","٢","٣","٤","٥","٦","٧","٨","٩"];
function ar(n){ return String(n).replace(/\d/g, function(d){ return AR[+d]; }); }
function money(n){
  var s = String(n), out = "", c = 0;
  for (var i = s.length - 1; i >= 0; i--){ out = s[i] + out; if (++c % 3 === 0 && i > 0) out = "٬" + out; }
  return ar(out);
}

/* ====== الزيارة والمصدر ====== */
function store(k,v){ try{ sessionStorage.setItem(k,v); }catch(e){} }
function load(k){ try{ return sessionStorage.getItem(k); }catch(e){ return null; } }
function newId(){
  var c = "abcdefghjkmnpqrstuvwxyz23456789", s = "";
  for (var i=0;i<12;i++) s += c.charAt(Math.floor(Math.random()*c.length));
  return s;
}
var VID = load("mz_vid");
if (!VID){ VID = newId(); store("mz_vid", VID); }

var qs  = new URLSearchParams(location.search);
var SRC = qs.get("src") || load("mz_src") || "unknown";
var CMP = qs.get("c")   || load("mz_cmp") || "";
store("mz_src", SRC); store("mz_cmp", CMP);
store("mz_first", load("mz_first") || new Date().toISOString());

var DEV = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? "موبايل" : "كمبيوتر";

/* ====== علامة التجربة: تُفعَّل من صفحة test.html (أو ?test=1) وتبقى ١٢ ساعة في هذا المتصفح ====== */
function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
function lsSet(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
if (qs.get("test") === "1") lsSet("mz_test_until", String(Date.now() + 12*3600*1000));
if (qs.get("test") === "0") lsSet("mz_test_until", "0");
var TEST = (+lsGet("mz_test_until") || 0) > Date.now();

/* ====== الأرقام العربية والفارسية → إنجليزية ====== */
function toEn(s){
  return String(s || "").replace(/[\u0660-\u0669]/g, function(d){ return String(d.charCodeAt(0) - 0x0660); })
                        .replace(/[\u06F0-\u06F9]/g, function(d){ return String(d.charCodeAt(0) - 0x06F0); });
}
function numVal(id){
  var el = document.getElementById(id); if (!el) return NaN;
  var v = toEn(el.value).trim().replace(/[\u066B,]/g, ".").replace(/\s+/g, "");
  if (!/^[0-9]+(\.[0-9]+)?$/.test(v)) return NaN;      /* يرفض السالب والنصوص والعلامات الزائدة */
  return Math.round(parseFloat(v) * 100) / 100;
}

function send(obj){
  obj.visit_id = VID;
  obj.ts = new Date().toISOString();
  obj.source = SRC;
  obj.campaign = CMP;
  obj.device = DEV;
  obj.test = TEST ? "YES" : "";
  try{
    var b = new Blob([JSON.stringify(obj)], {type:"text/plain;charset=UTF-8"});
    if (navigator.sendBeacon){ navigator.sendBeacon(SHEET, b); }
    else { fetch(SHEET, {method:"POST", mode:"no-cors", keepalive:true, body:b}); }
  }catch(e){}
}
/* الحدث يُرسَل مرّة واحدة لكل زيارة — لا لكل صفحة */
function once(ev, extra){
  var key = "mz_ev_" + ev + ":" + ((extra && extra.service) || "");
  if (load(key)) return;
  store(key, "1");
  var o = extra || {};
  o.event = ev;
  send(o);
}

var $ = function(id){ return document.getElementById(id); };

/* ====== E1 — فتح الموقع ====== */
once("E1");

/* ====== E2 — بلوغ قسم الخدمتين (الرئيسية وحدها) ====== */
/* E2 يبقى بتعريفه القديم (ظهور القسم أو الضغط على روابطه) حفاظًا على اتساق السجلات؛
   والمعنيان مفصولان في حدثين جديدين: P1 ظهور قسم الخدمتين في الشاشة · P2 الضغط على رابط خدمة من الرئيسية */
var picks = document.getElementById("picks");
if (picks && "IntersectionObserver" in window){
  var io = new IntersectionObserver(function(en){
    if (en[0].isIntersecting){ once("E2"); once("P1"); io.disconnect(); }
  }, {threshold:0.35});
  io.observe(picks);
}
Array.prototype.forEach.call(document.querySelectorAll("a[data-svc]"), function(a){
  a.addEventListener("click", function(){ once("E2"); once("P2", {service: a.getAttribute("data-svc")}); });
});

/* ====== عارض نماذج التقارير ====== */
(function(){
  var v = document.getElementById("viewer");
  if (!v) return;
  var box = document.getElementById("vbody");
  Array.prototype.forEach.call(document.querySelectorAll("[data-rep]"), function(el){
    el.addEventListener("click", function(){
      var n = +el.getAttribute("data-rep-n");
      var p = el.getAttribute("data-rep");
      var AR = ["٠","١","٢","٣","٤","٥","٦","٧","٨","٩"];
      var arn = function(x){ return String(x).replace(/\d/g, function(d){ return AR[+d]; }); };
      var html = '<div class="vcap">نموذج توضيحيّ — فارغ قبل التعبئة، '
               + 'والشكل النهائي قد يختلف في التفاصيل.</div>'
               + '<div class="hint">' + arn(n) + ' جزءًا — مرّر للأسفل</div>';
      for (var i=1;i<=n;i++){
        html += '<img src="img/report-'+p+'-'+i+'.webp" alt="جزء ' + i + '" loading="lazy">'
             +  '<div class="pg">' + arn(i) + ' / ' + arn(n) + '</div>';
      }
      box.innerHTML = html;
      v.classList.add("on");
      document.body.style.overflow = "hidden";
      v.scrollTop = 0;
    });
  });
  document.getElementById("vclose").addEventListener("click", function(){
    v.classList.remove("on");
    document.body.style.overflow = "";
  });
})();

/* ====== صفحتا المسارين ====== */
var SVC = document.body.getAttribute("data-svc");
if (SVC){
  var SVC_AR = { legal:"مراجعة العقد والمستندات — قبل التوقيع",
                 eng:"فحص الوحدة وما تمّ التعاقد عليه — قبل الاستلام" };
  var PRICE = null, AREA = "", GARDEN = 0, ROOF = 0, EXT = 0, OUT = false, CONFIRMED = false;

  /* ====== E3 — فتح صفحة الخدمة (يُسجَّل تلقائيًا عند الفتح؛ ليس قرارًا بالطلب) ====== */
  if (!load("mz_svc_" + SVC)){
    store("mz_svc_" + SVC, "1");
    send({event:"E3", service:SVC});
  }

  /* ====== F2 — الضغط على زر «اطلب الخدمة» في صفحة الخدمة ====== */
  Array.prototype.forEach.call(document.querySelectorAll('a[href="#order"]'), function(a){
    a.addEventListener("click", function(){ once("F2", {service:SVC}); });
  });

  /* ====== F1 — ظهور النموذج في نطاق الشاشة · PV — ظهور بطاقة السعر (القانوني: السعر ظاهر من البداية) ====== */
  function watch(id, ev, extra){
    var el = document.getElementById(id);
    if (!el || !("IntersectionObserver" in window)) return;
    var o = new IntersectionObserver(function(en){
      if (en[0].isIntersecting){ once(ev, extra); o.disconnect(); }
    }, {threshold:0.35});
    o.observe(el);
  }
  watch("order", "F1", {service:SVC});
  if (SVC === "legal") watch("priceCard", "PV", {service:SVC, price_shown:LEGAL_PRICE});

  /* ====== آخر حقل تفاعل معه الزائر — اسم الحقل فقط ====== */
  var LAST = "", LAST_SENT = "";
  function trackLast(container){
    var c = $(container); if (!c) return;
    var h = function(e){ var t = e.target; if (t && (t.id || t.name)) LAST = t.id || t.name; };
    c.addEventListener("focusin", h, true); c.addEventListener("input", h, true); c.addEventListener("change", h, true);
  }
  trackLast("fields"); trackLast("cfields");
  /* يُرسَل عند كل إخفاء للصفحة إن تغيّر الحقل؛ وفي التحليل يُؤخذ آخر L1 لكل زيارة وخدمة، ولا يُقرأ الإخفاء انسحابًا */
  function sendLast(){
    if (CONFIRMED || !LAST || LAST === LAST_SENT) return;
    LAST_SENT = LAST;
    send({event:"L1", service:SVC, last_field:LAST});
  }
  window.addEventListener("pagehide", sendLast);
  document.addEventListener("visibilitychange", function(){ if (document.visibilityState === "hidden") sendLast(); });

  /* ====== F3 — بدء إدخال بيانات الوحدة · C2 — بدء إدخال بيانات التواصل ====== */
  var fields = $("fields"), cfields = $("cfields");
  var fired4 = false, firedC2 = false;
  function e4(){ if (!fired4){ fired4 = true; once("E4", {service:SVC}); once("F3", {service:SVC}); } }
  fields.addEventListener("input", e4, true);
  fields.addEventListener("change", e4, true);
  function c2(){ if (!firedC2){ firedC2 = true; once("C2", {service:SVC}); } }
  cfields.addEventListener("input", c2, true);
  cfields.addEventListener("change", c2, true);

  $("f_unit").addEventListener("change", function(){
    var out = OUT_OF_SCOPE.indexOf(this.value) !== -1;
    Array.prototype.forEach.call(fields.children, function(ch){ if (!ch.contains($("f_unit"))) ch.classList.toggle("hide", out); });
    if (out) $("extOnly").classList.add("hide"); else if (radioVal("hasext") === "نعم") $("extOnly").classList.remove("hide");
    $("toPrice").textContent = out ? "متابعة" : (SVC === "eng" ? "اعرض السعر" : "أطلب الخدمة");
  });
  Array.prototype.forEach.call(document.querySelectorAll('input[name="hasext"]'), function(r){
    r.addEventListener("change", function(){
      $("extOnly").classList.toggle("hide", r.value !== "نعم" || !r.checked);
    });
  });

  /* ====== رسائل الخطأ بجوار الحقول ====== */
  function setErr(id, msg){
    var el = $("f_" + id) || null, box = $("e_" + id);
    if (el) el.style.borderColor = msg ? "#C0392B" : "";
    if (box){ box.textContent = msg || ""; box.style.display = msg ? "block" : "none"; }
  }
  function radioVal(name){
    var r = document.querySelector('input[name="'+name+'"]:checked');
    return r ? r.value : "";
  }
  function validateUnit(){
    var bad = [];
    ["unit","area","hasext","garden","roof"].forEach(function(k){ setErr(k, ""); });
    if (!$("f_unit").value){ setErr("unit", "اختر نوع الوحدة."); bad.push("f_unit"); return bad; }
    if (OUT_OF_SCOPE.indexOf($("f_unit").value) !== -1) return bad;   /* خارج النطاق: لا تُطلب بقية الحقول */
    if (SVC === "eng"){
      var a = numVal("f_area");
      if (!(a >= 20 && a <= 5000)){ setErr("area", "اكتب مساحة المباني بالأرقام (من ٢٠ إلى ٥٠٠٠ متر)."); bad.push("f_area"); }
      var hx = radioVal("hasext");
      if (!hx){ setErr("hasext", "اختر نعم أو لا."); bad.push("hasext"); }
      if (hx === "نعم"){
        var g = numVal("f_garden"), r = numVal("f_roof");
        if (isNaN(g) && isNaN(r)){ setErr("garden", "اكتب مساحة الحديقة أو الروف بالأرقام (أو ٠)."); bad.push("f_garden"); }
        if (!isNaN(g) && g > 5000){ setErr("garden", "المساحة أكبر من المتوقَّع — راجعها."); bad.push("f_garden"); }
        if (!isNaN(r) && r > 5000){ setErr("roof", "المساحة أكبر من المتوقَّع — راجعها."); bad.push("f_roof"); }
      }
    }
    return bad;
  }
  function validateContact(){
    var bad = [];
    ["name","phone","email","region"].forEach(function(k){ setErr(k, ""); });
    var name = ($("f_name").value || "").trim();
    if (name.length < 3){ setErr("name", "اكتب اسمك بالكامل."); bad.push("f_name"); }
    var ph = toEn($("f_phone").value).replace(/[\s-]/g, "");
    if (!/^\+?[0-9]{10,15}$/.test(ph)){ setErr("phone", "اكتب رقم هاتف صحيحًا (١٠ أرقام على الأقل)."); bad.push("f_phone"); }
    var em = ($("f_email").value || "").trim();
    if (em && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)){ setErr("email", "البريد الإلكتروني غير صحيح — أو اتركه فارغًا."); bad.push("f_email"); }
    if (!$("f_region").value){ setErr("region", "اختر المنطقة."); bad.push("f_region"); }
    return bad;
  }

  var sData = $("sData"), sPrice = $("sPrice"), sContact = $("sContact"), sOut = $("sOut");
  function show(sec){
    [sData, sPrice, sContact, sOut].forEach(function(x){ x.classList.add("hide"); });
    sec.classList.remove("hide"); window.scrollTo(0, $("order").offsetTop - 70);
  }

  /* ====== E5 — ظهور السعر ببيانات الوحدة فقط (بلا بيانات تواصل) · F4 — محاولة متابعة فاشلة ====== */
  $("toPrice").addEventListener("click", function(){
    var bad = validateUnit();
    if (bad.length){ $("err").style.display = "block"; send({event:"F4", service:SVC, step:"unit", fields:bad.join("|")}); var f0 = $(bad[0]); if (f0 && f0.focus) f0.focus(); return; }
    $("err").style.display = "none";

    OUT    = OUT_OF_SCOPE.indexOf($("f_unit").value) !== -1;
    AREA   = SVC === "eng" ? numVal("f_area") : "";
    GARDEN = SVC === "eng" && radioVal("hasext") === "نعم" ? (numVal("f_garden") || 0) : 0;
    ROOF   = SVC === "eng" && radioVal("hasext") === "نعم" ? (numVal("f_roof") || 0) : 0;
    EXT = GARDEN + ROOF;
    PRICE = OUT ? null : (SVC === "eng" ? engPrice(AREA, EXT) : LEGAL_PRICE);

    send({
      event: "E5", service: SVC, ts_first_seen: load("mz_first"),
      unit_type: $("f_unit").value, area_m2: AREA, garden_m2: GARDEN, roof_m2: ROOF,
      price_shown: PRICE === null ? "OUT_OF_SCOPE" : PRICE,
      price_total: PRICE === null ? "OUT_OF_SCOPE" : (SHOW_VAT ? withVat(PRICE) : PRICE),
      reached_price: PRICE === null ? "NO" : "YES"
    });

    if (PRICE === null){ show(sOut); return; }
    if (SVC === "legal"){ once("C1", {service:SVC, price_shown:PRICE}); show(sContact); return; }

    $("p_svc").textContent = SVC_AR[SVC];
    $("p_amt").textContent = money(PRICE) + " جنيه";
    $("p_vat").textContent = SHOW_VAT
      ? ("شاملًا ضريبة القيمة المضافة — الإجمالي " + money(withVat(PRICE)) + " جنيه")
      : "السعر لا يشمل ضريبة القيمة المضافة.";
    $("p_brk").textContent = "المباني: " + money(ENG_VISIT) + " + " + money(Math.round(ENG_RATE * AREA)) + " جنيه (" + ar(AREA) + " م²)"
      + (EXT > 0 ? " · الحديقة والروف: " + money(EXT_VISIT) + " + " + money(Math.round(EXT_RATE * EXT)) + " جنيه (" + ar(EXT) + " م²)" : "");
    show(sPrice);
  });

  /* ====== C1 — الضغط على «أطلب الخدمة» بعد رؤية السعر ====== */
  $("toContact").addEventListener("click", function(){ once("C1", {service:SVC, price_shown:PRICE}); show(sContact); });
  $("outBtn").addEventListener("click", function(){ show(sContact); });

  function fillHidden(){
    $("h_vid").value   = VID;
    $("h_test").value  = TEST ? "نعم — تجريبي" : "";
    $("h_svc").value   = SVC_AR[SVC];
    $("h_price").value = PRICE === null ? "خارج نطاق اختبار السعر"
                                        : ((SHOW_VAT ? withVat(PRICE) : PRICE) + " جنيه");
    $("h_name").value = $("f_name").value.trim();
    $("h_phone").value = toEn($("f_phone").value).trim();
    $("h_email").value = $("f_email").value.trim();
    $("h_region").value = $("f_region").value;
    $("h_project").value = $("f_project").value.trim();
    $("h_unit").value = $("f_unit").value;
    $("h_area").value = AREA; $("h_garden").value = GARDEN; $("h_roof").value = ROOF;
    $("h_hascontract").value = radioVal("hascontract");
    $("h_sdate").value = $("f_sdate") ? $("f_sdate").value : "";
    $("h_handover").value = radioVal("handover");
    $("h_hdate").value = $("f_hdate") ? $("f_hdate").value : "";
    $("h_src").value = SRC; $("h_campaign").value = CMP;
    $("confirmForm").action = MAIL;
    $("confirmForm").querySelector('input[name="_next"]').value = SITE + "/thanks.html?v=" + VID + "&s=" + SVC;
  }

  /* ====== E6 — تأكيد الطلب (مع بيانات التواصل) ====== */
  $("confirmForm").addEventListener("submit", function(e){
    var bad = validateContact();
    if (bad.length){ e.preventDefault(); $("cerr").style.display = "block"; send({event:"F4", service:SVC, step:"contact", fields:bad.join("|")}); return; }
    $("cerr").style.display = "none";
    fillHidden();
    CONFIRMED = true;
    send({event:"E6", service:SVC, ts_first_seen: load("mz_first"),
          name: $("h_name").value, phone: $("h_phone").value, email: $("h_email").value,
          region: $("h_region").value, project: $("h_project").value, unit_type: $("h_unit").value,
          area_m2: AREA, garden_m2: GARDEN, roof_m2: ROOF,
          has_contract: $("h_hascontract").value, expected_sign_date: $("h_sdate").value,
          handover_notice: $("h_handover").value, expected_handover_date: $("h_hdate").value,
          price_shown: PRICE === null ? "OUT_OF_SCOPE" : PRICE,
          price_total: PRICE === null ? "OUT_OF_SCOPE" : (SHOW_VAT ? withVat(PRICE) : PRICE),
          reached_price: PRICE === null ? "NO" : "YES",
          price_accepted: PRICE === null ? "" : "YES"});
    $("confirmBtn").disabled = true;
    $("confirmBtn").textContent = "جارٍ تسجيل طلبك…";
  });

  $("backPrice").addEventListener("click", function(){ show(sData); });
  $("backContact").addEventListener("click", function(){ show(PRICE === null ? sOut : (SVC === "legal" ? sData : sPrice)); });
  $("backOut").addEventListener("click", function(){ show(sData); });
}

/* ====== E8 — قبول خدمة الإرسال (formsubmit) للطلب ======
   صفحة الشكر لا تُفتح إلا بعد أن تقبل formsubmit الطلب؛ وE8 يعني ذلك فقط — لا يثبت وصول البريد.
   ضمان الإرسال: يُحفظ E8 «معلَّقًا» في هذا المتصفح بمفتاح (الزيارة + الخدمة) ويُرسَل بـ fetch.
   يُرفع من المعلَّقات إذا «أُرسل» — أي خرج الطلب من المتصفح ووصل إلى خادم Google — وهذا لا يثبت أنه
   «سُجِّل» في الشيت، لأن رد Apps Script لا يمكن قراءته من الموقع. عند فشل الإرسال يبقى معلَّقًا ويُعاد
   في كل فتح صفحة تالٍ حتى ٥ محاولات أو ٢٤ ساعة، ثم يُنقل إلى قائمة «لم يثبت تسليمه» ولا يُحذف منها.
   والضمان الفعلي للطلبات هو المطابقة اليومية بين البريد والشيت (انظر وثيقة التعريفات). */
var E8_KEY = "mz_e8_pending", E8_LOST = "mz_e8_unconfirmed";
function e8List(k){ try{ return JSON.parse(lsGet(k || E8_KEY) || "[]"); }catch(e){ return []; } }
function e8Save(l, k){ lsSet(k || E8_KEY, JSON.stringify(l)); }
function e8Flush(){
  var l = e8List(), now = Date.now(), keep = [], lost = e8List(E8_LOST);
  l.forEach(function(x){
    if (x.tries >= 5 || now - x.first >= 24*3600*1000){ x.moved = new Date().toISOString(); lost.push(x); }
    else keep.push(x);
  });
  e8Save(keep); e8Save(lost, E8_LOST);
  keep.forEach(function(x){
    x.tries++; e8Save(keep);
    var o = {event:"E8", visit_id:x.vid, service:x.svc, ts:x.ts, attempt:x.tries,
             source:x.src, campaign:x.cmp, device:DEV, test:x.test};
    try{
      fetch(SHEET, {method:"POST", mode:"no-cors", keepalive:true,
                    body:new Blob([JSON.stringify(o)], {type:"text/plain;charset=UTF-8"})})
        .then(function(){ /* أُرسل — لا يعني أنه سُجِّل */
          e8Save(e8List().filter(function(y){ return !(y.vid === x.vid && y.svc === x.svc); })); })
        .catch(function(){ /* فشل الإرسال: يبقى معلَّقًا */ });
    }catch(e){}
  });
}

/* ====== E7 — السؤالان الاختياريان في الصفحة الختامية (مربوط بالزيارة والخدمة) ====== */
var ansBtn = $("ansBtn");
var TQ = new URLSearchParams(location.search);
var T_VID = TQ.get("v") || VID, T_SVC = TQ.get("s") || "";
if (ansBtn && TQ.get("v")){
  var done = "mz_e8_done_" + T_VID + ":" + T_SVC;
  if (!lsGet(done)){
    lsSet(done, "1");   /* يمنع إضافته للمعلَّقات مرة أخرى عند إعادة تحميل الصفحة؛ ولا يعني نجاح التسجيل */
    var l = e8List();
    l.push({vid:T_VID, svc:T_SVC, ts:new Date().toISOString(), first:Date.now(), tries:0,
            src:SRC, cmp:CMP, test: TEST ? "YES" : ""});
    e8Save(l);
  }
}
e8Flush();

if (ansBtn){
  ansBtn.addEventListener("click", function(){
    var r = $("q_reason").value.trim(), w = $("q_want").value.trim();
    if (!r && !w) return;
    var o = {event:"E7", reason_text:r, service_wanted_text:w, service:T_SVC};
    o.visit_id = T_VID;
    o.ts = new Date().toISOString();
    o.source = SRC; o.campaign = CMP; o.device = DEV; o.test = TEST ? "YES" : "";
    try{
      var b = new Blob([JSON.stringify(o)], {type:"text/plain;charset=UTF-8"});
      if (navigator.sendBeacon){ navigator.sendBeacon(SHEET, b); }
      else { fetch(SHEET, {method:"POST", mode:"no-cors", keepalive:true, body:b}); }
    }catch(e){}
    $("qbox").classList.add("hide");
    $("qdone").classList.remove("hide");
  });
}

})();
