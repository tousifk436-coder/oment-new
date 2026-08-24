// ══════════════════════════════════════════════
// DIALOG + MODAL + TOAST
// ══════════════════════════════════════════════

var _dlgCb=null;

function showDlg(title,body,onOk){
  document.getElementById('dlg-t').textContent=title;
  document.getElementById('dlg-b').innerHTML=body;
  _dlgCb=onOk;
  var ok=document.getElementById('dlg-ok');
  ok.textContent='Confirm';ok.onclick=function(){cDlg();_dlgCb&&_dlgCb();};
  document.getElementById('dlg-cancel').onclick=cDlg;
  document.getElementById('dlg-ov').classList.add('on');
}
// alias used in codebase
function sDlg(title,body,onOk){showDlg(title,body,onOk);}

function closeDlg(){cDlg();}
function cDlg(){document.getElementById('dlg-ov').classList.remove('on');}

function oMod(title,body,btns){
  document.getElementById('mod-t').textContent=title;
  document.getElementById('mod-b').innerHTML=body;
  var f=document.getElementById('mod-f');f.innerHTML='';
  (btns||[]).forEach(function(b){
    var el=document.createElement('button');
    el.className='btn '+b.cls;el.textContent=b.l;
    /* Pehle yahan eval(b.a) tha with a swallowed catch — har modal button eval
       se chalta tha aur error chup-chaap gayab ho jaata tha. Ab function
       references. */
    el.onclick=(typeof b.a==='function')
      ? b.a
      : function(){console.error('oMod: button "'+b.l+'" needs a function, got:',b.a);};
    f.appendChild(el);
  });
  document.getElementById('mod-ov').classList.add('on');
}
function cMod(){document.getElementById('mod-ov').classList.remove('on');}

function toast(msg,type){
  var w=document.getElementById('toast-w');
  var t=document.createElement('div');
  t.className='toast'+(type?' '+type:'');t.textContent=msg;
  w.appendChild(t);
  setTimeout(function(){t.classList.add('on');},10);
  setTimeout(function(){t.classList.remove('on');setTimeout(function(){t.remove();},300);},2800);
}
