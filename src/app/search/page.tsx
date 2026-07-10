import Container from "@/components/layout/container";
import SiteBannerAd from "@/components/ads/site-banner-ad";
import React from "react";
import SearchResults from "@/components/search/search-results";

const page = () => {
  return (
    <Container>
      <SiteBannerAd className="pt-6 pb-2" />
      <SearchResults />
    </Container>
  );
};

export default page;

