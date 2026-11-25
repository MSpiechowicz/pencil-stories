import React from 'react';
import {Composition, Still} from 'remotion';
import {Journey, PagePreview} from './pencil/Journey';
import {CoverVertical, ThumbWide} from './pencil/Hook';
import {AvatarFace, AvatarIcon, Banner, Watermark, WordmarkLogo} from './brand/Brand';
import {FILMS, WIDE} from './pencil/plan';
import {LONG} from './stories/current';
import {Book} from './book/Book';
import {MISSING_PIECE, MISSING_PIECE_KOKORO, MISSING_PIECE_SHORT, MISSING_PIECE_SHORT_KOKORO, MISSING_PIECE_YOUTUBE} from './stories/missing-piece/film';
import {NOTE_LAB, NoteLab} from './pencil/NoteLab';
import {MissingPieceCover, MissingPieceThumb} from './stories/missing-piece/ReleaseArt';

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
    <Composition id="MissingPieceWide" component={Book}
      defaultProps={{film: MISSING_PIECE, outroText: {title: 'Keep going.', sub: 'Follow for one reason a day to keep going.'}}}
      width={2560} height={1440} fps={30} durationInFrames={MISSING_PIECE.total} />
    <Composition id="MissingPieceKokoro" component={Book}
      defaultProps={{film: MISSING_PIECE_KOKORO, outroText: {title: 'Keep going.', sub: 'Follow for one reason a day to keep going.'}}}
      width={2560} height={1440} fps={30} durationInFrames={MISSING_PIECE_KOKORO.total} />
    <Composition id="MissingPieceYouTube" component={Book}
      defaultProps={{film: MISSING_PIECE_YOUTUBE, outroText: {title: 'Keep going.', sub: 'Follow for one reason a day to keep going.'}}}
      width={2560} height={1440} fps={30} durationInFrames={MISSING_PIECE_YOUTUBE.total} />
    <Composition id="MissingPieceShortsLaura" component={Book}
      defaultProps={{film: MISSING_PIECE_SHORT, layout: 'tall' as const, outroText: {title: 'Keep going.', sub: 'Follow for one reason a day to keep going.'}}}
      width={1440} height={2560} fps={30} durationInFrames={MISSING_PIECE_SHORT.total} />
    <Composition id="MissingPieceShorts" component={Book}
      defaultProps={{film: MISSING_PIECE_SHORT_KOKORO, layout: 'tall' as const, outroText: {title: 'Keep going.', sub: 'Follow for one reason a day to keep going.'}}}
      width={1440} height={2560} fps={30} durationInFrames={MISSING_PIECE_SHORT_KOKORO.total} />
    <Composition id="MissingPieceReels" component={Book}
      defaultProps={{film: MISSING_PIECE_SHORT_KOKORO, layout: 'tall' as const, outroText: {title: 'Keep going.', sub: 'Follow for one reason a day to keep going.'}}}
      width={1080} height={1920} fps={30} durationInFrames={MISSING_PIECE_SHORT_KOKORO.total} />
    <Still id="MissingPieceThumb" component={MissingPieceThumb} width={1280} height={720} />
    <Still id="MissingPieceCover" component={MissingPieceCover} width={1080} height={1920} />
    <Still id="NoteLab" component={NoteLab} width={NOTE_LAB.w} height={NOTE_LAB.h} />
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
