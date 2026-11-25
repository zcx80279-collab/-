import React from 'react';
import { DeveloperModeNarratorGuide } from './modules/DeveloperModeNarratorGuide';
import './developer.css';
import { aiService } from '../ai/aiService';
import { platformService } from '../platform/platformService';
import { AppSettings } from '../core/types';

export function DeveloperPage({ onDeactivate, appSettings }: { onDeactivate: () => void; appSettings: AppSettings }) {
  return <section className="developer-page" aria-label="개발자 관리 페이지">
    <header className="developer-header"><h2>개발자 관리</h2><button type="button" onClick={onDeactivate}>개발자 모드 비활성화</button></header>
    <div className="developer-info"><h3>데이터베이스 기술 정보</h3><p>lovy_lovy_talk_db · 스키마 v{appSettings.schemaVersion}</p><p>스토어: characters, messages, stories, community, assets, settings, rooms</p></div>
    <div className="developer-info"><h3>플랫폼 및 빌드 정보</h3><p>{platformService.getPlatformStatus().nativeBuildStatusNote}</p><p>{platformService.getPlatformStatus().updatePolicyNote}</p></div>
    <div className="developer-info"><h3>AI 통신 및 사회자 연동 상태</h3><p>{aiService.getLayerStatus().phase}</p><p>{aiService.getLayerStatus().note}</p></div>
    <DeveloperModeNarratorGuide />
  </section>;
}
