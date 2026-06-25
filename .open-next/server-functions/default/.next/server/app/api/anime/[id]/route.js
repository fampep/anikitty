(()=>{var e={};e.id=5516,e.ids=[5516],e.modules={10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},13734:(e,t,r)=>{"use strict";r.r(t),r.d(t,{patchFetch:()=>y,routeModule:()=>p,serverHooks:()=>g,workAsyncStorage:()=>l,workUnitAsyncStorage:()=>c});var i={};r.r(i),r.d(i,{GET:()=>m});var a=r(96559),n=r(48088),o=r(37719),s=r(33497);let d=`
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      idMal
      title { english romaji native }
      description(asHtml: false)
      coverImage { extraLarge large }
      bannerImage
      episodes
      format
      status
      duration
      averageScore
      genres
      synonyms
      season
      seasonYear
      source
      startDate { year month day }
      endDate { year month day }
      nextAiringEpisode { episode }
      studios { nodes { name isAnimationStudio } }
      trailer { id site }
      recommendations(page: 1, perPage: 12) {
        nodes {
          mediaRecommendation {
            id title { english romaji } coverImage { extraLarge } episodes format
          }
        }
      }
      relations {
        edges {
          relationType(version: 2)
          node {
            id title { english romaji } coverImage { extraLarge } type episodes format
          }
        }
      }
      characters(sort: ROLE, page: 1, perPage: 12) {
        edges {
          role
          node { id name { full } image { large } }
          voiceActors(language: JAPANESE) { id name { full } image { large } }
        }
      }
    }
  }
`;function u(e){return{id:String(e.id),name:(0,s.wy)(e.title),jname:e.title?.romaji??"",poster:e.coverImage?.extraLarge??"",episodes:{sub:e.episodes??0,dub:0},type:(0,s.Vr)(e.format),duration:"",rating:null}}async function m(e,{params:t}){let{id:r}=await t,i=parseInt(r,10);if(isNaN(i))return Response.json({error:"Invalid anime id"},{status:400});try{let e=(await (0,s.lH)(d,{id:i})).Media;if(!e)return Response.json({error:"Not found"},{status:404});let t=e.nextAiringEpisode?e.nextAiringEpisode.episode-1:e.episodes??0,r=(e.studios?.nodes??[]).filter(e=>e.isAnimationStudio).map(e=>e.name),a=(e.studios?.nodes??[]).filter(e=>!e.isAnimationStudio).map(e=>e.name),n={anime:{info:{id:String(e.id),anilistId:e.id,malId:e.idMal??0,name:(0,s.wy)(e.title),poster:e.coverImage?.extraLarge??"",description:(e.description??"").replace(/<[^>]*>/g,""),stats:{rating:e.averageScore?`${(e.averageScore/10).toFixed(1)}/10`:"N/A",quality:"HD",episodes:{sub:t,dub:0},type:(0,s.Vr)(e.format),duration:e.duration?`${e.duration} min`:"N/A"},promotionalVideos:e.trailer?.site==="youtube"?[{title:"Trailer",source:`https://youtube.com/watch?v=${e.trailer.id}`,thumbnail:""}]:[],charactersVoiceActors:(e.characters?.edges??[]).map(e=>({character:{id:String(e.node.id),poster:e.node.image?.large??"",name:e.node.name.full,cast:"MAIN"===e.role?"Main":"Supporting"},voiceActor:{id:String(e.voiceActors?.[0]?.id??""),poster:e.voiceActors?.[0]?.image?.large??"",name:e.voiceActors?.[0]?.name?.full??"",cast:"Japanese"}}))},moreInfo:{japanese:e.title?.native??"",synonyms:(e.synonyms??[]).join(", "),aired:`${(0,s.LW)(e.startDate)} to ${(0,s.LW)(e.endDate)}`,premiered:`${e.season??""} ${e.seasonYear??""}`.trim()||"N/A",duration:e.duration?`${e.duration} min`:"N/A",status:(0,s.mf)(e.status),malscore:"N/A",genres:e.genres??[],studios:r.join(", "),producers:a}},seasons:[],mostPopularAnimes:(e.relations?.edges??[]).filter(e=>"ANIME"===e.node.type).slice(0,5).map(e=>u(e.node)),relatedAnimes:(e.relations?.edges??[]).filter(e=>"ANIME"===e.node.type).map(e=>u(e.node)),recommendedAnimes:(e.recommendations?.nodes??[]).filter(e=>e.mediaRecommendation).map(e=>u(e.mediaRecommendation))};return Response.json({data:n})}catch(e){return console.error("AniList details error:",e),Response.json({error:"Failed to fetch anime details"},{status:500})}}let p=new a.AppRouteRouteModule({definition:{kind:n.RouteKind.APP_ROUTE,page:"/api/anime/[id]/route",pathname:"/api/anime/[id]",filename:"route",bundlePath:"app/api/anime/[id]/route"},resolvedPagePath:"C:\\Users\\lukas\\Downloads\\anikitty\\src\\app\\api\\anime\\[id]\\route.ts",nextConfigOutput:"standalone",userland:i}),{workAsyncStorage:l,workUnitAsyncStorage:c,serverHooks:g}=p;function y(){return(0,o.patchFetch)({workAsyncStorage:l,workUnitAsyncStorage:c})}},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},33497:(e,t,r)=>{"use strict";async function i(e,t){let r=await fetch("https://graphql.anilist.co",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({query:e,variables:t}),cache:"no-store"}),i=await r.json();if(i.errors)throw Error(i.errors[0].message);return i.data}function a(e){return e.english||e.romaji||"Unknown"}function n(e){return e?({TV:"TV",TV_SHORT:"TV",MOVIE:"Movie",OVA:"OVA",ONA:"ONA",SPECIAL:"Special",MUSIC:"Music"})[e]??e:"TV"}function o(e){return({FINISHED:"Finished Airing",RELEASING:"Currently Airing",NOT_YET_RELEASED:"Not yet aired",CANCELLED:"Cancelled",HIATUS:"On Hiatus"})[e??""]??"Unknown"}function s(e){if(!e?.year)return"N/A";let t=[e.year];return e.month&&t.push(e.month),e.day&&t.push(e.day),new Date(e.year,(e.month??1)-1,e.day??1).toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"})}r.d(t,{LW:()=>s,Vr:()=>n,lH:()=>i,mf:()=>o,wy:()=>a})},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},78335:()=>{},96487:()=>{},96559:(e,t,r)=>{"use strict";e.exports=r(44870)}};var t=require("../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),i=t.X(0,[7719],()=>r(13734));module.exports=i})();