import React from 'react';

interface ChromeMockupProps {
  chromeStyle: 'mac' | 'windows' | 'none';
  chromeTheme: 'dark' | 'light';
}

export default function ChromeMockup({ chromeStyle, chromeTheme }: ChromeMockupProps) {
  if (chromeStyle === 'none') return null;

  if (chromeStyle === 'mac') {
    return (
      <div className={`preview-chrome-mac ${chromeTheme}`}>
        <div className="dot dot-red" />
        <div className="dot dot-yellow" />
        <div className="dot dot-green" />
      </div>
    );
  }

  if (chromeStyle === 'windows') {
    return (
      <div className={`preview-chrome-win ${chromeTheme}`}>
        <div className="win-min" />
        <div className="win-icon" />
        <div className="win-close" />
      </div>
    );
  }

  return null;
}
