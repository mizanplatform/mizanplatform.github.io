/* ميزان — القياس ومحرّك السعر · مشتركٌ بين كل الصفحات
   منقولٌ عن نسخة الاختبار الأولى بلا تغيير في المنطق:
   الأحداث السبعة، ومعرّف الزيارة، والمصدر، ومعادلة السعر. */
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
  return p;
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

function send(obj){
  obj.visit_id = VID;
  obj.ts = new Date().toISOString();
  obj.source = SRC;
  obj.campaign = CMP;
  obj.device = DEV;
  try{
    var b = new Blob([JSON.stringify(obj)], {type:"text/plain;charset=UTF-8"});
    if (navigator.sendBeacon){ navigator.sendBeacon(SHEET, b); }
    else { fetch(SHEET, {method:"POST", mode:"no-cors", keepalive:true, body:b}); }
  }catch(e){}
}
/* الحدث يُرسَل مرّة واحدة لكل زيارة — لا لكل صفحة */
function once(ev, extra){
  if (load("mz_ev_" + ev)) return;
  store("mz_ev_" + ev, "1");
  var o = extra || {};
  o.event = ev;
  send(o);
}

var $ = function(id){ return document.getElementById(id); };

/* ====== E1 — فتح الموقع ====== */
once("E1");

/* ====== E2 — بلوغ قسم الخدمتين (الرئيسية وحدها) ====== */
var picks = document.getElementById("picks");
if (picks && "IntersectionObserver" in window){
  var io = new IntersectionObserver(function(en){
    if (en[0].isIntersecting){ once("E2"); io.disconnect(); }
  }, {threshold:0.35});
  io.observe(picks);
}
Array.prototype.forEach.call(document.querySelectorAll("a[data-svc]"), function(a){
  a.addEventListener("click", function(){ once("E2"); });
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
      var html = '<div class="vcap">نموذج توضيحيّ — البيانات الواردة فيه غير حقيقية.</div>';
      for (var i=1;i<=n;i++) html += '<img src="img/report-'+p+'-'+i+'.webp" alt="صفحة ' + i + '">';
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
  var PRICE = null, AREA = null, GARDEN = 0, ROOF = 0, EXT = 0;

  /* ====== E3 — اختيار الخدمة ====== */
  if (!load("mz_svc_" + SVC)){
    store("mz_svc_" + SVC, "1");
    send({event:"E3", service:SVC});
  }

  var fields = $("fields");
  var fired4 = false;
  function e4(){ if (!fired4){ fired4 = true; once("E4", {service:SVC}); } }
  fields.addEventListener("input", e4, true);
  fields.addEventListener("change", e4, true);

  Array.prototype.forEach.call(document.querySelectorAll('input[name="hasext"]'), function(r){
    r.addEventListener("change", function(){
      $("extOnly").classList.toggle("hide", r.value !== "نعم" || !r.checked);
    });
  });

  function mark(el, bad){ if (el) el.style.borderColor = bad ? "#C0392B" : ""; }
  function radioVal(name){
    var r = document.querySelector('input[name="'+name+'"]:checked');
    return r ? r.value : "";
  }
  function validate(){
    var ok = true, v;
    var reqs = [["f_name",3],["f_phone",10],["f_email",5],["f_region",1],["f_project",2],["f_unit",1]];
    reqs.forEach(function(p){
      var el = $(p[0]); v = (el.value||"").trim();
      var bad = v.length < p[1];
      if (p[0]==="f_email" && !bad) bad = !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
      if (p[0]==="f_phone" && !bad) bad = !/^[0-9+\s-]{10,15}$/.test(v);
      mark(el, bad); if (bad) ok = false;
    });
    if (SVC === "eng"){
      var a = parseInt($("f_area").value, 10);
      var bad = !(a > 0 && a < 5000);
      mark($("f_area"), bad); if (bad) ok = false;
      if (!radioVal("hasext")) ok = false;
      if (!radioVal("handover")) ok = false;
    } else {
      if (!radioVal("hascontract")) ok = false;
    }
    return ok;
  }

  var sData = $("sData"), sPrice = $("sPrice"), sOut = $("sOut");

  /* ====== E5 — إتمام البيانات، ويُكتب السطر قبل عرض السعر ====== */
  $("toPrice").addEventListener("click", function(){
    if (!validate()){ $("err").style.display = "block"; return; }
    $("err").style.display = "none";

    var OUT = OUT_OF_SCOPE.indexOf($("f_unit").value) !== -1;
    AREA   = SVC === "eng" ? parseInt($("f_area").value, 10) : "";
    GARDEN = SVC === "eng" ? (parseInt($("f_garden").value, 10) || 0) : 0;
    ROOF   = SVC === "eng" ? (parseInt($("f_roof").value, 10) || 0) : 0;
    if (radioVal("hasext") !== "نعم"){ GARDEN = 0; ROOF = 0; }
    EXT = GARDEN + ROOF;
    PRICE = OUT ? null : (SVC === "eng" ? engPrice(AREA, EXT) : LEGAL_PRICE);

    var data = {
      event: "E5",
      service: SVC,
      ts_first_seen: load("mz_first"),
      name:    $("f_name").value.trim(),
      phone:   $("f_phone").value.trim(),
      email:   $("f_email").value.trim(),
      region:  $("f_region").value,
      project: $("f_project").value.trim(),
      unit_type: $("f_unit").value,
      area_m2: AREA,
      garden_m2: GARDEN,
      roof_m2: ROOF,
      has_contract: radioVal("hascontract"),
      expected_sign_date: $("f_sdate") ? $("f_sdate").value : "",
      handover_notice: radioVal("handover"),
      expected_handover_date: $("f_hdate") ? $("f_hdate").value : "",
      price_shown: PRICE === null ? "OUT_OF_SCOPE" : PRICE,
      price_total: PRICE === null ? "OUT_OF_SCOPE" : (SHOW_VAT ? withVat(PRICE) : PRICE),
      reached_price: PRICE === null ? "NO" : "YES"
    };
    send(data);

    $("h_vid").value   = VID;
    $("h_svc").value   = SVC_AR[SVC];
    $("h_price").value = PRICE === null ? "خارج نطاق اختبار السعر"
                                        : ((SHOW_VAT ? withVat(PRICE) : PRICE) + " جنيه");
    $("h_name").value = data.name;
    $("h_phone").value = data.phone;
    $("h_email").value = data.email;
    $("h_region").value = data.region;
    $("h_project").value = data.project;
    $("h_unit").value = data.unit_type;
    $("h_area").value = data.area_m2;
    $("h_garden").value = data.garden_m2;
    $("h_roof").value = data.roof_m2;
    $("h_hascontract").value = data.has_contract;
    $("h_sdate").value = data.expected_sign_date;
    $("h_handover").value = data.handover_notice;
    $("h_hdate").value = data.expected_handover_date;
    $("h_src").value = SRC;
    $("h_campaign").value = CMP;
    $("confirmForm").action = MAIL;
    $("confirmForm").querySelector('input[name="_next"]').value = SITE + "/thanks.html?v=" + VID;

    if (PRICE === null){
      sData.classList.add("hide");
      sOut.classList.remove("hide");
      window.scrollTo(0,0);
      return;
    }

    $("p_svc").textContent = SVC_AR[SVC];
    $("p_amt").textContent = money(PRICE) + " جنيه";
    $("p_vat").textContent = SHOW_VAT
      ? ("شاملًا ضريبة القيمة المضافة — الإجمالي " + money(withVat(PRICE)) + " جنيه")
      : "السعر لا يشمل ضريبة القيمة المضافة.";
    $("p_inc").textContent = SVC === "eng"
      ? "يشمل السعر إعادة فحص الوحدة مرّة واحدة بعد معالجة الملاحظات."
      : "يشمل السعر مراجعة نسخة معدَّلة من العقد مرّة واحدة دون تكلفة إضافية، إذا أُرسلت خلال ٦٠ يومًا من تاريخ التقرير.";

    sData.classList.add("hide");
    sPrice.classList.remove("hide");
    window.scrollTo(0,0);
  });

  /* ====== E6 — التأكيد بعد رؤية السعر ====== */
  $("confirmForm").addEventListener("submit", function(){
    send({event:"E6", service:SVC,
          price_shown: PRICE === null ? "OUT_OF_SCOPE" : PRICE,
          price_accepted: PRICE === null ? "" : "YES"});
    var btn = PRICE === null ? $("outBtn") : $("confirmBtn");
    btn.disabled = true;
    btn.textContent = "جارٍ تسجيل طلبك…";
  });

  $("outBtn").addEventListener("click", function(){
    var f = $("confirmForm");
    if (f.requestSubmit){ f.requestSubmit(); }
    else {
      send({event:"E6", service:SVC, price_shown:"OUT_OF_SCOPE", price_accepted:""});
      $("outBtn").disabled = true;
      $("outBtn").textContent = "جارٍ تسجيل طلبك…";
      f.submit();
    }
  });

  $("backPrice").addEventListener("click", function(){
    sPrice.classList.add("hide"); sData.classList.remove("hide"); window.scrollTo(0,0);
  });
  $("backOut").addEventListener("click", function(){
    sOut.classList.add("hide"); sData.classList.remove("hide"); window.scrollTo(0,0);
  });
}

/* ====== E7 — السؤالان الاختياريان في الصفحة الختامية ====== */
var ansBtn = $("ansBtn");
if (ansBtn){
  var vid = new URLSearchParams(location.search).get("v") || VID;
  ansBtn.addEventListener("click", function(){
    var r = $("q_reason").value.trim(), w = $("q_want").value.trim();
    if (!r && !w) return;
    var o = {event:"E7", reason_text:r, service_wanted_text:w};
    o.visit_id = vid;
    o.ts = new Date().toISOString();
    o.source = SRC; o.campaign = CMP; o.device = DEV;
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
