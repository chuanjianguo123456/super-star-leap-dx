'use strict';
// Evidence/regression: route recording -> actual touch handlers -> normal G.update.
// No position/HP/power/invulnerability/enemy changes, no I.poll overrides.
const fs=require('fs'),path=require('path');
const ROOT=process.env.SSL_ROOT||path.resolve(__dirname,'..');
const {load}=require(path.join(ROOT,'tools/harness.cjs'));
const H=load({w:1280,h:800,touch:true}),{SSL,G}=H;
SSL.audio.setMusic(false);SSL.audio.setSfx(false);
const args=process.argv.slice(2),file=args.find(a=>a.endsWith('.json'))||path.join(__dirname,'playtests/tutorial-route.json');
const route=JSON.parse(fs.readFileSync(file));
let rand=route.seed||12345;Math.random=()=>{rand^=rand<<13;rand^=rand>>>17;rand^=rand<<5;return(rand>>>0)/4294967296;};
const idx=route.level||0;G.newGame(idx);while(G.state==='intro')G.update(SSL.DT);
const map={left:['bLeft',1],right:['bRight',2],run:['bRun',3],jump:['bJump',4]};let held={};
for(const [n,[id]]of Object.entries(map))H.els[id].rect={left:n==='left'?30:n==='right'?150:n==='run'?950:1100,top:640,width:90,height:90};
H.els.bDown.rect={left:950,top:520,width:60,height:60};SSL.input.refreshButtons();
function touch(next){for(const[n,[id,pointerId]]of Object.entries(map))if(!!next[n]!==!!held[n]){
 const r=H.els[id].rect;H.fire(next[n]?'pointerdown':'pointerup',{pointerId,pointerType:'touch',button:0,target:H.canvas,clientX:r.left+r.width/2,clientY:r.top+r.height/2});
}held={...next};}
let frame=0,captured=0;const framesDir=args.includes('--frames')?(process.env.SSL_FRAMES_DIR||path.resolve('playtest-frames')):null;
if(framesDir)fs.mkdirSync(framesDir,{recursive:true});
function capture(){if(!framesDir||frame%4)return;
 const randomBefore=rand;G.render(frame/60);rand=randomBefore;
 // Capture only gameplay, with explicit overlay describing simulation, not a claim of human realtime play.
 const g=G.ctx,d=G.dpr;g.setTransform(d,0,0,d,0,0);g.textAlign='left';g.textBaseline='alphabetic';g.globalAlpha=1;g.fillStyle='#10192c';g.fillRect(0,G.playH,G.cssW,G.cssH-G.playH);
 g.font='bold 20px sans-serif';g.fillStyle='#ffda70';g.fillText('AI INPUT REPLAY | NORMAL ENEMIES & DAMAGE | NO TELEPORT / GOD MODE',24,G.playH+36);
 if(G.screen==='sc-clear'){g.fillStyle='#8ff0b6';g.fillText('LEVEL CLEAR - passed normal flag / clear-screen flow',24,G.playH+110);}
 g.font='18px sans-serif';g.fillStyle='#d9e7ff';g.fillText('Held: '+Object.keys(held).filter(n=>held[n]).join(' + ')+'    Frame '+frame+'    Lives '+G.lives,24,G.playH+74);
 fs.writeFileSync(path.join(framesDir,String(captured++).padStart(5,'0')+'.png'),H.canvas.toBuffer('image/png'));
}
function update(){G.update(SSL.DT);frame++;capture();if(G.world.player.dead)throw new Error('Route died at tile '+G.world.player.x/32+' frame '+frame);}
for(let i=0;i<30;i++)update();let lastJump=false;
for(const a of route.path)for(let f=0;f<a.f;f++){
 let jump=a.jump&&f<a.hold;if(f===0&&lastJump)jump=false;
 touch({left:a.dir<0,right:a.dir>0,run:a.run,jump});lastJump=jump;update();
}
touch({});for(let i=0;i<600&&G.state==='playing';i++)update();for(let i=0;i<100&&!G.screen;i++)update();
if(G.screen!=='sc-clear')throw new Error('No clear screen: '+G.state+'/'+G.screen);
const result={ok:true,level:G.level.world,state:G.state,screen:G.screen,simulatedSeconds:+(frame/60).toFixed(2),lives:G.lives,score:G.score,enemiesRetained:true,noStateCheats:true,inputs:'pointerdown/up',captured};
if(framesDir){capture();fs.writeFileSync(path.join(framesDir,'clear.png'),H.canvas.toBuffer('image/png'));}
console.log(JSON.stringify(result));
