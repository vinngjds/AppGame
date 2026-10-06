const G=require(require('path').join(__dirname,'..','js','core.js'));
function play(trainMax){
  const st=G.newState('x'); let log=[];
  let fights=0, deaths=0, train=0;
  function autoGear(){ // equip best, sell rest; buy upgrades w/ gold
    for(const it of st.bag.slice()){ const cur=st.equipped[it.slot]; if(G.itemScore(it)>G.itemScore(cur)) G.equip(st,it.id); }
    for(const it of st.bag.slice()) G.sell(st,it.id);
    // buy best shop item for each slot if affordable and better
    for(const it of st.shop.equip.concat(st.shop.amulet)){ if(G.itemScore(it)>G.itemScore(st.equipped[it.slot])*1.05 && st.gold>=G.itemPrice(it)+G.potionPrice(st,'small')*2){ G.buyItem(st,it.id); G.equip(st,it.id);} }
    for(const s of G.SLOT_ORDER){const it=st.equipped[s]; if(it&&it.plus<4&&st.gold>G.upgradeCost(it)*2) G.upgrade(st,it.id);}
  }
  function fight(mon,mode){
    const f=G.startFight(st,mon,{mode}); let n=0;
    while(!f.over&&n++<200){
      let a='attack';
      if(f.hero.hp<f.hero.max*0.35){ if(st.potions.large>0)a='potion-large'; else if(st.potions.small>0)a='potion-small'; }
      if(a==='attack'&&f.heavyCd===0)a='heavy';
      G.heroAction(st,f,a);
    }
    return {f,rep:G.finishFight(st,f)};
  }
  while(st.bossesBeaten<15 && fights<2000){
    G.syncTime(st, st.hpAt+200000); st.energy=10; autoGear();
    const {mon,mode}=G.nextStoryMonster(st);
    G.setHp(st,G.heroStats(st).hp);
    const r=fight(mon,mode); fights++;
    if(!r.rep.won){deaths++; if(mode==='boss'){ // farm
        for(let i=0;i<trainMax;i++){ G.setHp(st,G.heroStats(st).hp); fight(G.trainingMonster(st),'training'); train++; autoGear();}
      }}
    if(mode==='boss'&&r.rep.won) log.push(`boss${mon.bossNo} L${st.level} gold${st.gold} train${train} deaths${deaths}`);
  }
  return {lvl:st.level,boss:st.bossesBeaten,fights,deaths,train,log};
}
for(const t of [0,5,10]){const r=play(t);console.log('trainChunk',t,r.lvl,r.boss,r.fights,r.deaths,r.train);}
console.log(play(5).log.join('\n'));
