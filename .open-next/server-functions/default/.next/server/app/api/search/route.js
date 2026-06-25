(()=>{var e={};e.id=6202,e.ids=[6202],e.modules={10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},23977:(e,t,r)=>{"use strict";r.r(t),r.d(t,{patchFetch:()=>S,routeModule:()=>h,serverHooks:()=>A,workAsyncStorage:()=>m,workUnitAsyncStorage:()=>E});var a={};r.r(a),r.d(a,{GET:()=>l});var s=r(96559),n=r(48088),i=r(37719),o=r(33497);let p=`
  query (
    $search: String
    $page: Int
    $perPage: Int
    $format: MediaFormat
    $status: MediaStatus
    $season: MediaSeason
    $genre_in: [String]
    $sort: [MediaSort]
  ) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { total currentPage lastPage hasNextPage perPage }
      media(
        type: ANIME
        search: $search
        format: $format
        status: $status
        season: $season
        genre_in: $genre_in
        sort: $sort
      ) {
        id
        title { english romaji }
        coverImage { extraLarge }
        episodes
        format
        status
        nextAiringEpisode { episode }
      }
    }
  }
`,u={tv:"TV",movie:"MOVIE",ova:"OVA",ona:"ONA",special:"SPECIAL",music:"MUSIC","tv-short":"TV_SHORT"},d={"finished-airing":"FINISHED","currently-airing":"RELEASING","not-yet-aired":"NOT_YET_RELEASED"},c={score:"SCORE_DESC","name-a-z":"TITLE_ENGLISH","most-watched":"POPULARITY_DESC","recently-added":"START_DATE_DESC","recently-updated":"UPDATED_AT_DESC","released-date":"START_DATE_DESC"};function g(e){return e.split("-").map(e=>e.charAt(0).toUpperCase()+e.slice(1)).join(" ")}async function l(e){let{searchParams:t}=new URL(e.url),r=t.get("q")||"",a=Math.max(1,parseInt(t.get("page")||"1",10)),s=t.get("type")||"",n=t.get("status")||"",i=t.get("season")||"",l=t.get("genres")||"",h=t.get("sort")||"",m=r.replace(/^"+|"+$/g,"").trim(),E=u[s]??void 0,A=d[n]??void 0,S=i?i.toUpperCase():void 0,y=l?l.split(",").map(g).filter(Boolean):void 0,T=c[h];try{let e=await (0,o.lH)(p,{search:m||void 0,page:a,perPage:20,format:E,status:A,season:S,genre_in:y,sort:T?[T]:m?["SEARCH_MATCH"]:["POPULARITY_DESC"]}),t=e.Page?.pageInfo??{},r=(e.Page?.media??[]).map(e=>({id:String(e.id),name:(0,o.wy)(e.title),jname:e.title?.romaji??"",poster:e.coverImage?.extraLarge??"",episodes:{sub:e.nextAiringEpisode?e.nextAiringEpisode.episode-1:e.episodes??0,dub:0},type:(0,o.Vr)(e.format)}));return Response.json({data:{animes:r,totalPages:t.lastPage??1,hasNextPage:t.hasNextPage??!1,currentPage:t.currentPage??a}})}catch(e){return console.error("AniList search error:",e),Response.json({error:"Search failed"},{status:500})}}let h=new s.AppRouteRouteModule({definition:{kind:n.RouteKind.APP_ROUTE,page:"/api/search/route",pathname:"/api/search",filename:"route",bundlePath:"app/api/search/route"},resolvedPagePath:"C:\\Users\\lukas\\Downloads\\anikitty\\src\\app\\api\\search\\route.ts",nextConfigOutput:"standalone",userland:a}),{workAsyncStorage:m,workUnitAsyncStorage:E,serverHooks:A}=h;function S(){return(0,i.patchFetch)({workAsyncStorage:m,workUnitAsyncStorage:E})}},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},33497:(e,t,r)=>{"use strict";async function a(e,t){let r=await fetch("https://graphql.anilist.co",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({query:e,variables:t}),cache:"no-store"}),a=await r.json();if(a.errors)throw Error(a.errors[0].message);return a.data}function s(e){return e.english||e.romaji||"Unknown"}function n(e){return e?({TV:"TV",TV_SHORT:"TV",MOVIE:"Movie",OVA:"OVA",ONA:"ONA",SPECIAL:"Special",MUSIC:"Music"})[e]??e:"TV"}function i(e){return({FINISHED:"Finished Airing",RELEASING:"Currently Airing",NOT_YET_RELEASED:"Not yet aired",CANCELLED:"Cancelled",HIATUS:"On Hiatus"})[e??""]??"Unknown"}function o(e){if(!e?.year)return"N/A";let t=[e.year];return e.month&&t.push(e.month),e.day&&t.push(e.day),new Date(e.year,(e.month??1)-1,e.day??1).toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"})}r.d(t,{LW:()=>o,Vr:()=>n,lH:()=>a,mf:()=>i,wy:()=>s})},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},78335:()=>{},96487:()=>{},96559:(e,t,r)=>{"use strict";e.exports=r(44870)}};var t=require("../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),a=t.X(0,[7719],()=>r(23977));module.exports=a})();