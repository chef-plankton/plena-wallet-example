import * as React from "react";
import styled from "styled-components";
import banner from "../assets/Pl_dark.png";

const SBannerWrapper = styled.div`
  display: flex;
  align-items: center;
  position: relative;
`;

const SBanner = styled.div`
  width: 400px;
  height: 45px;
  background: url(${banner}) no-repeat;
  background-size: cover;
  background-position: center;
  resize-mode: contain;
  margin-top: 20px;
`;

const Banner = () => (
  <SBannerWrapper>
    <SBanner />
  </SBannerWrapper>
);

export default Banner;
