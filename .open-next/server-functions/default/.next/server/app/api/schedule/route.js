(()=>{var e={};e.id=985,e.ids=[985],e.modules={10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},33497:(e,t,r)=>{"use strict";async function i(e,t){let r=await fetch("https://graphql.anilist.co",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({query:e,variables:t}),cache:"no-store"}),i=await r.json();if(i.errors)throw Error(i.errors[0].message);return i.data}function n(e){return e.english||e.romaji||"Unknown"}function a(e){return e?({TV:"TV",TV_SHORT:"TV",MOVIE:"Movie",OVA:"OVA",ONA:"ONA",SPECIAL:"Special",MUSIC:"Music"})[e]??e:"TV"}function s(e){return({FINISHED:"Finished Airing",RELEASING:"Currently Airing",NOT_YET_RELEASED:"Not yet aired",CANCELLED:"Cancelled",HIATUS:"On Hiatus"})[e??""]??"Unknown"}function o(e){if(!e?.year)return"N/A";let t=[e.year];return e.month&&t.push(e.month),e.day&&t.push(e.day),new Date(e.year,(e.month??1)-1,e.day??1).toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"})}r.d(t,{LW:()=>o,Vr:()=>a,lH:()=>i,mf:()=>s,wy:()=>n})},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},78335:()=>{},96487:()=>{},96559:(e,t,r)=>{"use strict";e.exports=r(44870)},97486:(e,t,r)=>{"use strict";r.r(t),r.d(t,{patchFetch:()=>h,routeModule:()=>l,serverHooks:()=>g,workAsyncStorage:()=>p,workUnitAsyncStorage:()=>c});var i={};r.r(i),r.d(i,{GET:()=>d});var n=r(96559),a=r(48088),s=r(37719),o=r(33497);let u=`
  query ($airingAt_greater: Int, $airingAt_lesser: Int) {
    Page(page: 1, perPage: 50) {
      airingSchedules(
        airingAt_greater: $airingAt_greater
        airingAt_lesser: $airingAt_lesser
        sort: TIME
      ) {
        episode
        airingAt
        media {
          id
          title { english romaji }
        }
      }
    }
  }
`;async function d(e){let{searchParams:t}=new URL(e.url),r=t.get("date"),i=r?new Date(r):new Date;i.setHours(0,0,0,0);let n=Math.floor(i.getTime()/1e3);try{let e=await (0,o.lH)(u,{airingAt_greater:n-1,airingAt_lesser:n+86400}),t=Math.floor(Date.now()/1e3),r=(e.Page?.airingSchedules??[]).map(e=>({id:String(e.media.id),name:(0,o.wy)(e.media.title),jname:e.media.title?.romaji??"",time:new Date(1e3*e.airingAt).toISOString(),airingTimestamp:1e3*e.airingAt,secondsUntilAiring:e.airingAt-t,episode:e.episode}));return Response.json({data:{scheduledAnimes:r}})}catch(e){return console.error("AniList schedule error:",e),Response.json({data:{scheduledAnimes:[]}})}}let l=new n.AppRouteRouteModule({definition:{kind:a.RouteKind.APP_ROUTE,page:"/api/schedule/route",pathname:"/api/schedule",filename:"route",bundlePath:"app/api/schedule/route"},resolvedPagePath:"C:\\Users\\lukas\\Downloads\\anikitty\\src\\app\\api\\schedule\\route.ts",nextConfigOutput:"standalone",userland:i}),{workAsyncStorage:p,workUnitAsyncStorage:c,serverHooks:g}=l;function h(){return(0,s.patchFetch)({workAsyncStorage:p,workUnitAsyncStorage:c})}}};var t=require("../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),i=t.X(0,[7719],()=>r(97486));module.exports=i})();