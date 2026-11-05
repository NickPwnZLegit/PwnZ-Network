// PwnZ cosmetic badge catalog and read-only progress model.
// All earned states are DERIVED from Firestore records or private verified Eden ownership.
// Nothing in this module transfers tokens, issues NFTs, or grants permissions.
export const PWNZ_BADGES = Object.freeze([
  {id:"pwnz-member",symbol:"🎮",name:"PwnZ Member",description:"Create a unique PwnZ Live profile",rule:"profile"},
  {id:"first-signal",symbol:"📡",name:"First Signal",description:"Publish your first PwnZ community post",rule:"posts1"},
  {id:"signal-architect",symbol:"🌠",name:"Signal Architect",description:"Publish five community posts",rule:"posts5"},
  {id:"orbit-builder",symbol:"🪐",name:"Orbit Builder",description:"Follow five PwnZ creators",rule:"follows5"},
  {id:"clip-caster",symbol:"🎞️",name:"Clip Caster",description:"Share a YouTube video in a community post",rule:"youtube1"},
  {id:"eden-bridge",symbol:"🌌",name:"Eden Bridge",description:"Connect an active, verified Eden RealID account",rule:"verifiedEden"},
  {id:"light-bearer",symbol:"✨",name:"Light Bearer",description:"Future cross-network community achievement",rule:"future"},
  {id:"stream-sentinel",symbol:"📺",name:"Stream Sentinel",description:"Future verified Twitch creator milestone",rule:"future"},
  {id:"arena-founder",symbol:"⚔️",name:"Arena Founder",description:"Future licensed Arena TestNet participation",rule:"future"},
  {id:"champion-star",symbol:"🏆",name:"Champion Star",description:"Future validated tournament achievement",rule:"future"},
  {id:"pwnz-constellation",symbol:"💠",name:"PwnZ Constellation",description:"Future special community recognition",rule:"future"}
]);
export function evaluatePwnzBadges({hasProfile=false,postCount=0,followCount=0,youtubeCount=0,verifiedEden=false}={}) {
  return PWNZ_BADGES.map(badge => {
    const earned = {
      profile:hasProfile,posts1:postCount>=1,posts5:postCount>=5,
      follows5:followCount>=5,youtube1:youtubeCount>=1,
      verifiedEden:Boolean(verifiedEden),future:false
    }[badge.rule]===true;
    return {...badge,earned,planned:badge.rule==="future"};
  });
}
