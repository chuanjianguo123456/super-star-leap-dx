'use strict';
const {load}=require('./harness.cjs');const {SSL}=load({touch:true});const{TS,DT}=SSL;let checks=0;
const inp=x=>Object.assign({left:false,right:false,down:false,jump:false,run:false,pressed:{},released:{}},x);
function assert(ok,msg){checks++;if(!ok)throw Error(msg);}
function world(lv){const w=new SSL.World(lv,{});w.sfx=()=>{};w.camX=0;w.viewW=1107;return w;}
function peak(hold){const b=new SSL.LB({id:90,w:80,world:'T',theme:'meadow'});b.ground(0,80);const w=world(b.build()),p=w.player=new SSL.Player(100,13*TS);for(let i=0;i<2;i++)w.step(DT,inp());const feet=p.y+p.h;let rise=0;for(let f=0;f<100;f++){w.step(DT,inp({jump:f<hold,pressed:{jump:f===0}}));rise=Math.max(rise,feet-p.y-p.h);}return rise;}
const tap=peak(1),held=peak(30);assert(tap>=85,'tap jump needs a useful 85px minimum, got '+tap);assert(held>tap+15,'long-hold still adds deliberate height');
const lv=SSL.LEVELS[0];let gaps=[],start=null;for(let x=0;x<lv.w;x++){const ground=SSL.isSolidTile(lv.tiles[13*lv.w+x]);if(!ground&&start===null)start=x;if(ground&&start!==null){gaps.push([start,x-start]);start=null;}}
assert(gaps.length===4,'all four teaching gaps remain');assert(gaps.every(q=>q[1]<=2),'tutorial direct ground gaps are at most two tiles');
for(const tx of [27,38,143,147]){let top=0;for(let y=0;y<13;y++)if(lv.tiles[y*lv.w+tx]>=SSL.T.PIPE_TL&&lv.tiles[y*lv.w+tx]<=SSL.T.PIPE_BR){top=13-y;break;}assert(top<=2,'no mandatory tutorial pipe above two tiles at '+tx);}
// Normal ground takeoffs, not late coyote jumps: long jump has at least 24px timing width.
for(const[tx,width]of gaps){let success=[];for(let offset=2;offset<=50;offset+=2){const w=world(lv),p=w.player=new SSL.Player(tx*TS-offset-SSL.PHYS.w,13*TS);for(let i=0;i<2;i++)w.step(DT,inp());assert(p.onGround,'pit test starts on actual ground');p.vx=SSL.PHYS.walk;let landed=false;for(let f=0;f<110;f++){w.step(DT,inp({right:true,jump:f<30,pressed:{jump:f===0}}));if(p.dead)break;if(p.onGround&&p.x>=(tx+width)*TS){landed=true;break;}}if(landed)success.push(offset);}
 assert(success.length>=11,'tutorial pit '+tx+' lacks a useful walking takeoff window: '+success.join(','));}
console.log('PLAYABILITY OK ('+checks+' checks): tap='+tap.toFixed(1)+'px hold='+held.toFixed(1)+'px; four tutorial gaps and pipe recovery verified');
