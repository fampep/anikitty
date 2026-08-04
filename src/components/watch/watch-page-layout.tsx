"use client";

import React, { useState } from "react";
import VideoPlayerSection from "@/components/watch/video-player-section";
import WatchEpisodeSidebar from "@/components/watch/watch-episode-sidebar";
import WatchRecommendationsSidebar from "@/components/watch/watch-recommendations-sidebar";
import { cn } from "@/lib/core/utils";

export default function WatchPageLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-background dark:bg-black flex flex-col">
      {/* Main Content - 2 Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column - Player */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          <div className="sticky top-0 z-20 bg-background/95 dark:bg-black/95 backdrop-blur-sm border-b border-border/50 dark:border-white/5 p-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>·</span>
              <span>Monster</span>
              <span>·</span>
              <span>Episode 1</span>
            </div>
          </div>

          {/* Video Player */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 bg-black">
              <VideoPlayerSection />
            </div>
          </div>

          {/* Anime Info Below Player */}
          <div className="bg-background dark:bg-black/50 border-t border-border/50 dark:border-white/5 p-6">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-start gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-foreground dark:text-white mb-1">
                    Monster
                  </h2>
                  <p className="text-sm text-muted-foreground dark:text-white/60 mb-3">
                    Episode 1 - Dub • 8.8 - 2004 • Drama
                  </p>
                  <p className="text-sm text-foreground/80 dark:text-white/70 leading-relaxed">
                    Doctor Tenma is a brilliant Japanese neurosurgeon who works at Eisler Memorial Hospital in Germany. He is doing well professionally and is even engaged to the hospital director's daughter...
                    <button className="text-primary hover:underline ml-1">more</button>
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mb-6">
                <button className="px-4 py-2 bg-white text-black rounded-lg font-semibold hover:bg-white/90 transition">
                  Subscribe
                </button>
                <button className="p-2 hover:bg-muted/50 dark:hover:bg-white/5 rounded-lg transition">
                  👍 7.4k
                </button>
                <button className="p-2 hover:bg-muted/50 dark:hover:bg-white/5 rounded-lg transition">
                  👎
                </button>
                <button className="p-2 hover:bg-muted/50 dark:hover:bg-white/5 rounded-lg transition">
                  Share
                </button>
                <button className="p-2 hover:bg-muted/50 dark:hover:bg-white/5 rounded-lg transition">
                  Discord
                </button>
              </div>

              {/* Comments Section */}
              <div className="border-t border-border/50 dark:border-white/5 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">0 Comments</h3>
                  <button className="text-sm text-muted-foreground hover:text-foreground transition">
                    Sort by
                  </button>
                </div>

                <div className="text-center py-8 text-muted-foreground dark:text-white/40">
                  <p className="mb-3">Create an account to add a comment</p>
                  <p className="text-xs mb-4">Join the discussion — sign up free, then leave your take.</p>
                  <button className="px-6 py-2 border border-foreground/20 dark:border-white/20 rounded-lg text-sm font-medium hover:bg-muted/50 dark:hover:bg-white/5 transition">
                    Create account
                  </button>
                  <p className="text-xs text-muted-foreground dark:text-white/40 mt-4">No comments yet</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Episodes & Recommendations */}
        {sidebarOpen && (
          <div className={cn(
            "border-l border-border/50 dark:border-white/5 bg-background/50 dark:bg-white/[0.02] flex flex-col",
            "w-80 max-w-80 overflow-hidden"
          )}>
            {/* Tabs */}
            <div className="border-b border-border/50 dark:border-white/5 p-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">Episodes</h3>
                <button className="text-xs text-muted-foreground hover:text-foreground transition">
                  ⇅
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                <span>Playing</span>
                <span>•</span>
                <span>Episode 1</span>
                <span>•</span>
                <span>74 total</span>
              </div>

              {/* Search */}
              <input
                type="text"
                placeholder="Search Episode"
                className="w-full px-3 py-2 bg-muted/30 dark:bg-white/5 border border-border/30 dark:border-white/10 rounded-lg text-xs placeholder-muted-foreground/60 focus:outline-none focus:border-primary/50 transition"
              />
            </div>

            {/* Episodes List */}
            <div className="flex-1 overflow-y-auto">
              <WatchEpisodeSidebar />
            </div>

            {/* Recommendations */}
            <div className="border-t border-border/50 dark:border-white/5 overflow-y-auto">
              <WatchRecommendationsSidebar />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
