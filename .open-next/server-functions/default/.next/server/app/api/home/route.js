(()=>{var e={};e.id=3851,e.ids=[3851],e.modules={10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},33497:(e,t,r)=>{"use strict";async function i(e,t){let r=await fetch("https://graphql.anilist.co",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({query:e,variables:t}),cache:"no-store"}),i=await r.json();if(i.errors)throw Error(i.errors[0].message);return i.data}function a(e){return e.english||e.romaji||"Unknown"}function o(e){return e?({TV:"TV",TV_SHORT:"TV",MOVIE:"Movie",OVA:"OVA",ONA:"ONA",SPECIAL:"Special",MUSIC:"Music"})[e]??e:"TV"}function s(e){return({FINISHED:"Finished Airing",RELEASING:"Currently Airing",NOT_YET_RELEASED:"Not yet aired",CANCELLED:"Cancelled",HIATUS:"On Hiatus"})[e??""]??"Unknown"}function n(e){if(!e?.year)return"N/A";let t=[e.year];return e.month&&t.push(e.month),e.day&&t.push(e.day),new Date(e.year,(e.month??1)-1,e.day??1).toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"})}r.d(t,{LW:()=>n,Vr:()=>o,lH:()=>i,mf:()=>s,wy:()=>a})},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},66136:(e,t,r)=>{"use strict";r.r(t),r.d(t,{patchFetch:()=>A,routeModule:()=>g,serverHooks:()=>c,workAsyncStorage:()=>u,workUnitAsyncStorage:()=>l});var i={};r.r(i),r.d(i,{GET:()=>m});var a=r(96559),o=r(48088),s=r(37719),n=r(33497);let p=`
  query {
    spotlight: Page(page: 1, perPage: 10) {
      media(type: ANIME, sort: POPULARITY_DESC, status: RELEASING) {
        id
        title { english romaji }
        coverImage { extraLarge }
        bannerImage
        description(asHtml: false)
        episodes
        nextAiringEpisode { episode }
        format
      }
    }
    trending: Page(page: 1, perPage: 20) {
      media(type: ANIME, sort: TRENDING_DESC) {
        id title { english romaji } coverImage { extraLarge } episodes format trending
      }
    }
    popular: Page(page: 1, perPage: 20) {
      media(type: ANIME, sort: POPULARITY_DESC, status: RELEASING) {
        id title { english romaji } coverImage { extraLarge } episodes format
      }
    }
    favorite: Page(page: 1, perPage: 20) {
      media(type: ANIME, sort: FAVOURITES_DESC) {
        id title { english romaji } coverImage { extraLarge } episodes format
      }
    }
    latest: Page(page: 1, perPage: 20) {
      media(type: ANIME, sort: END_DATE_DESC, status: FINISHED) {
        id title { english romaji } coverImage { extraLarge } episodes format
      }
    }
    upcoming: Page(page: 1, perPage: 20) {
      media(type: ANIME, sort: POPULARITY_DESC, status: NOT_YET_RELEASED) {
        id title { english romaji } coverImage { extraLarge } episodes format
      }
    }
  }
`;function d(e){return{id:String(e.id),name:(0,n.wy)(e.title),jname:e.title?.romaji??"",poster:e.coverImage?.extraLarge??"",episodes:{sub:e.nextAiringEpisode?e.nextAiringEpisode.episode-1:e.episodes??0,dub:0},type:(0,n.Vr)(e.format),rank:e.trending??void 0}}async function m(){try{let e=await (0,n.lH)(p),t={spotlightAnimes:(e.spotlight?.media??[]).map((e,t)=>({rank:t+1,id:String(e.id),name:(0,n.wy)(e.title),jname:e.title?.romaji??"",poster:e.bannerImage??e.coverImage?.extraLarge??"",description:(e.description??"").replace(/<[^>]*>/g,""),episodes:{sub:e.nextAiringEpisode?e.nextAiringEpisode.episode-1:e.episodes??0,dub:0},type:(0,n.Vr)(e.format),otherInfo:[]})),trendingAnimes:(e.trending?.media??[]).map(d),latestEpisodeAnimes:(e.popular?.media??[]).map(d),mostFavoriteAnimes:(e.favorite?.media??[]).map(d),mostPopularAnimes:(e.popular?.media??[]).map(d),latestCompletedAnimes:(e.latest?.media??[]).map(d),topUpcomingAnimes:(e.upcoming?.media??[]).map(d),topAiringAnimes:[],top10Animes:{today:[],week:[],month:[]},genres:[]};return Response.json({data:t})}catch(e){return console.error("AniList home error:",e),Response.json({error:"Failed to fetch home data"},{status:500})}}let g=new a.AppRouteRouteModule({definition:{kind:o.RouteKind.APP_ROUTE,page:"/api/home/route",pathname:"/api/home",filename:"route",bundlePath:"app/api/home/route"},resolvedPagePath:"C:\\Users\\lukas\\Downloads\\anikitty\\src\\app\\api\\home\\route.ts",nextConfigOutput:"standalone",userland:i}),{workAsyncStorage:u,workUnitAsyncStorage:l,serverHooks:c}=g;function A(){return(0,s.patchFetch)({workAsyncStorage:u,workUnitAsyncStorage:l})}},78335:()=>{},96487:()=>{},96559:(e,t,r)=>{"use strict";e.exports=r(44870)}};var t=require("../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),i=t.X(0,[7719],()=>r(66136));module.exports=i})();