import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HomeScreen } from './screens/HomeScreen';
import { AnalyticsScreen } from './screens/AnalyticsScreen';
import { RuckScreen } from './screens/RuckScreen';
import { TrainScreen } from './screens/TrainScreen';
import { InstructorScreen } from './screens/InstructorScreen';
import { initialSessions, TrainingSession } from './data/mockData';
import { colours, shadow } from './theme';

type Tab = 'home' | 'train' | 'ruck' | 'analytics' | 'instructor';

const tabs: Array<{ id: Tab; label: string; icon: keyof typeof Ionicons.glyphMap; iconActive: keyof typeof Ionicons.glyphMap }> = [
  { id: 'home',       label: 'Home',    icon: 'home-outline',      iconActive: 'home' },
  { id: 'train',      label: 'Train',   icon: 'barbell-outline',   iconActive: 'barbell' },
  { id: 'ruck',       label: 'Ruck',    icon: 'footsteps-outline', iconActive: 'footsteps' },
  { id: 'analytics',  label: 'Intel',   icon: 'analytics-outline', iconActive: 'analytics' },
  { id: 'instructor', label: 'Coach',   icon: 'people-outline',    iconActive: 'people' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [sessions, setSessions] = useState<TrainingSession[]>(initialSessions);

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

  return (
    <View style={styles.app}>
      {renderScreen()}

      {/* ── Tab Bar ─────────────────────────────────── */}
      <View style={[styles.tabBar, shadow.card]}>
        {/* Glass top highlight */}
        <View style={styles.tabBarHighlight} />

        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <Pressable
              key={tab.id}
              style={({ pressed }) => [styles.tabItem, pressed && styles.tabItemPressed]}
              onPress={() => setActiveTab(tab.id)}
              accessibilityRole="button"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: isActive }}
            >
              {isActive ? (
                /* Active pill */
                <View style={styles.activePill}>
                  <Ionicons name={tab.iconActive} size={18} color={colours.background} />
                  <Text style={styles.activePillLabel}>{tab.label}</Text>
                </View>
              ) : (
                /* Inactive icon + label */
                <View style={styles.inactiveItem}>
                  <Ionicons name={tab.icon} size={20} color={colours.muted} />
                  <Text style={styles.inactiveLabel}>{tab.label}</Text>
                </View>
              )}
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

  /* Tab bar shell */
  tabBar: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: 'rgba(4, 8, 15, 0.94)',
    overflow: 'hidden',
  },

  tabBarHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colours.borderGlass,
  },

  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 20,
  },

  tabItemPressed: {
    opacity: 0.70,
  },

  /* Active state — filled pill */
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colours.cyan,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    ...shadow.cyan,
  },

  activePillLabel: {
    color: colours.background,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.4,
  },

  /* Inactive state */
  inactiveItem: {
    alignItems: 'center',
    gap: 3,
  },

  inactiveLabel: {
    color: colours.muted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
