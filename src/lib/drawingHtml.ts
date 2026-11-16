// Page HTML d'une zone de dessin (canvas) affichée dans une WebView.
// Dessin au doigt/stylet ; export PNG renvoyé au natif via postMessage.
// Auto-contenu : aucune dépendance réseau.
export const drawingHtml = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>html,body{margin:0;height:100%;background:#101712;overscroll-behavior:none}
#c{display:block;width:100%;height:100%;touch-action:none}</style>
</head><body><canvas id="c"></canvas><script>
(function(){
  var c=document.getElementById('c'),ctx=c.getContext('2d'),dpr=Math.max(1,window.devicePixelRatio||1);
  function fillBg(){ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#101712';ctx.fillRect(0,0,c.width,c.height);ctx.restore();}
  function setup(){c.width=c.clientWidth*dpr;c.height=c.clientHeight*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#e8ece9';ctx.lineWidth=2.5;fillBg();}
  setup();
  var drawing=false,lx=0,ly=0;
  function pos(e){var r=c.getBoundingClientRect();var t=e.touches?e.touches[0]:e;return{x:t.clientX-r.left,y:t.clientY-r.top};}
  function down(e){drawing=true;var p=pos(e);lx=p.x;ly=p.y;if(e.cancelable)e.preventDefault();}
  function move(e){if(!drawing)return;var p=pos(e);ctx.beginPath();ctx.moveTo(lx,ly);ctx.lineTo(p.x,p.y);ctx.stroke();lx=p.x;ly=p.y;if(e.cancelable)e.preventDefault();}
  function up(){drawing=false;}
  c.addEventListener('pointerdown',down);c.addEventListener('pointermove',move);
  c.addEventListener('pointerup',up);c.addEventListener('pointerleave',up);
  window.__clear=function(){ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,c.width,c.height);ctx.restore();fillBg();};
  window.__export=function(){try{var d=c.toDataURL('image/png');var m=window.ReactNativeWebView;if(m&&m.postMessage){m.postMessage(d);}else if(window.parent){window.parent.postMessage(d,'*');}}catch(e){}};
})();
</script></body></html>`;
