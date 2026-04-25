import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HomeScreen } from './screens/HomeScreen';
import { AnalyticsScreen } from './screens/AnalyticsScreen';
import { RuckScreen } from './screens/RuckScreen';
import { TrainScreen } from './screens/TrainScreen';
import { InstructorScreen } from './screens/InstructorScreen';
import { EnvironmentScreen } from './screens/EnvironmentScreen';
import { CognitiveScreen } from './screens/CognitiveScreen';
import { initialSessions, TrainingSession } from './data/mockData';
import { useStorage } from './hooks/useStorage';
import { colours } from './theme';

type Tab = 'home' | 'train' | 'ruck' | 'analytics' | 'instructor' | 'environment' | 'cognitive';

const tabs: Array<{ id: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'train', label: 'Train', icon: 'barbell' },
  { id: 'ruck', label: 'Ruck', icon: 'footsteps' },
  { id: 'analytics', label: 'Intel', icon: 'analytics' },
  { id: 'instructor', label: 'Coach', icon: 'people' },
  { id: 'environment', label: 'Mission', icon: 'earth' },
  { id: 'cognitive', label: 'Mind', icon: 'pulse' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [sessions, setSessions, sessionsLoaded] = useStorage<TrainingSession[]>(
    'forge:sessions',
    initialSessions,
  );

  function addSession(session: TrainingSession) {
    setSessions((current) => [session, ...current]);
  }

  function renderScreen() {
    switch (activeTab) {
      case 'train':
        return <TrainScreen addSession={addSession} />;
      case 'ruck':
        return <RuckScreen addSession={addSession} />;
      case 'analytics':
        return <AnalyticsScreen sessions={sessions} />;
      case 'instructor':
        return <InstructorScreen />;
      case 'environment':
        return <EnvironmentScreen />;
      case 'cognitive':
        return <CognitiveScreen />;
      default:
        return (
          <HomeScreen
            sessions={sessions}
            goToRuck={() => setActiveTab('ruck')}
            goToAnalytics={() => setActiveTab('analytics')}
          />
        );
    }
  }

  if (!sessionsLoaded) {
    return <View style={styles.app} />;
  }

  return (
    <View style={styles.app}>
      {renderScreen()}
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;

          return (
            <Pressable key={tab.id} style={styles.tabButton} onPress={() => setActiveTab(tab.id)}>
              <Ionicons name={tab.icon} size={21} color={isActive ? colours.cyan : colours.muted} />
              <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: colours.background,
  },
  tabBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: '#101827',
  },
  tabButton: {
    flex: 1,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabLabel: {
    color: colours.muted,
    fontSize: 9,
    fontWeight: '700',
  },
  activeTabLabel: {
    color: colours.cyan,
  },
});
