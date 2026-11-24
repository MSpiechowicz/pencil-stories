import React from 'react';
import {Composition, Still} from 'remotion';
import {Journey, PagePreview} from './pencil/Journey';
import {CoverVertical, ThumbWide} from './pencil/Hook';
import {AvatarFace, AvatarIcon, Banner, Watermark, WordmarkLogo} from './brand/Brand';
import {FILMS, WIDE} from './pencil/plan';
import {LONG} from './stories/current';

const even = (n: number) => Math.ceil(n / 2) * 2;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="LaidOff20Years" component={Journey} defaultProps={{variant: 'long' as const}}
      width={1080} height={1920} fps={30} durationInFrames={FILMS.long.TOTAL_FRAMES} />
    <Composition id="LaidOff20YearsWide" component={Journey} defaultProps={{variant: 'wide' as const, layout: 'wide' as const}}
      width={WIDE.w} height={WIDE.h} fps={30} durationInFrames={FILMS.wide.TOTAL_FRAMES} />
    <Composition id="LaidOffShortYouTube" component={Journey} defaultProps={{variant: 'reel' as const, layout: 'tall2k' as const}}
      width={1440} height={2560} fps={30} durationInFrames={FILMS.reel.TOTAL_FRAMES} />
    <Composition id="LaidOffShortReels" component={Journey} defaultProps={{variant: 'reel' as const}}
      width={1080} height={1920} fps={30} durationInFrames={FILMS.reel.TOTAL_FRAMES} />
    <Composition id="LaidOffShort" component={Journey} defaultProps={{variant: 'short' as const}}
      width={1080} height={1920} fps={30} durationInFrames={FILMS.short.TOTAL_FRAMES} />
    <Still id="CoverVertical" component={CoverVertical} defaultProps={{hook: LONG.hook}} width={1080} height={1920} />
    <Still id="BrandAvatarFace" component={AvatarFace} width={800} height={800} />
    <Still id="BrandAvatarIcon" component={AvatarIcon} width={800} height={800} />
    <Still id="BrandBanner" component={Banner} width={2560} height={1440} />
    <Still id="BrandWordmark" component={WordmarkLogo} width={2000} height={600} />
    <Still id="BrandWatermark" component={Watermark} width={150} height={150} />
    <Still id="ThumbWide" component={ThumbWide} defaultProps={{hook: LONG.hook}} width={1280} height={720} />
    <Composition id="PagePreview" component={PagePreview} defaultProps={{variant: 'long' as const}}
      width={1080} height={even(FILMS.long.WORLD_H)} fps={30} durationInFrames={1} />
    <Composition id="PagePreviewShort" component={PagePreview} defaultProps={{variant: 'short' as const}}
      width={1080} height={even(FILMS.short.WORLD_H)} fps={30} durationInFrames={1} />
  </>
);
