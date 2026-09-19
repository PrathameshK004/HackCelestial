/**
 * SplashScreen — Triptual
 * Minimal, High-End Popular App Design (Airbnb / Apple style)
 * Clean, uncluttered, smooth animations, crisp Retina typography.
 *
 * Feature: Sleek luxury executive airliner flies in a strictly straight
 * horizontal direction from left to right, perfectly centered with the text,
 * smoothly unmasking the brand name "TRIPTUAL" in its wake.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  StatusBar,
  Dimensions,
  Image,
  Platform,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

const { width: W } = Dimensions.get('window');

const TITLE_WIDTH = Math.min(W * 0.78, 270);

/**
 * Pixel-perfect Horizontal Executive Jet
 * Drawn strictly horizontal (pointing 0° straight to the right).
 * Deep Olive (#2E331B) body + Champagne Gold (#D4AF37) accents.
 */
const HorizontalJet: React.FC<{ size?: number }> = ({ size = 22 }) => {
  const svgWidth = size * 1.6;
  return (
    <Svg width={svgWidth} height={size} viewBox="0 0 40 24" fill="none">
      {/* Swept Main Wings */}
      <Path
        d="M15 12L7 2H11L21 12L11 22H7L15 12Z"
        fill="#3A4022"
        stroke="#D4AF37"
        strokeWidth={0.8}
        strokeLinejoin="round"
      />
      {/* Horizontal Stabilizers / Tail Wings */}
      <Path
        d="M6 12L2 6H4.5L9 12L4.5 18H2L6 12Z"
        fill="#2E331B"
        stroke="#D4AF37"
        strokeWidth={0.6}
      />
      {/* Sleek Aerodynamic Fuselage (strictly horizontal centerline at y=12) */}
      <Path
        d="M3 12C3 10.8 5 10.2 8 10.2H24C30 10.2 35 11.2 38 12C35 12.8 30 13.8 24 13.8H8C5 13.8 3 13.2 3 12Z"
        fill="#2E331B"
        stroke="#D4AF37"
        strokeWidth={1}
      />
      {/* Cockpit Golden Sheen */}
      <Path
        d="M27 11.2C30 11.2 33 11.6 34.5 12C33 12.4 30 12.8 27 12.8V11.2Z"
        fill="#F5E4B2"
      />
      {/* Center Beacon */}
      <Circle cx="13" cy="12" r="1.2" fill="#FFFFFF" />
    </Svg>
  );
};

interface Props {
  onSkip?: () => void;
}

export const SplashScreen: React.FC<Props> = () => {
  // Screen Fade In
  const screenFade = useRef(new Animated.Value(0)).current;

  // Logo Entrance & Float
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoFloat = useRef(new Animated.Value(0)).current;

  // Subtle Halo Pulse behind logo
  const haloScale1 = useRef(new Animated.Value(1)).current;
  const haloOpacity1 = useRef(new Animated.Value(0.35)).current;
  const haloScale2 = useRef(new Animated.Value(1)).current;
  const haloOpacity2 = useRef(new Animated.Value(0.2)).current;

  // Plane Flight & Text Reveal Master Animation
  const planeFlight = useRef(new Animated.Value(0)).current;

  // Bottom Progress Fill
  const bottomOpacity = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Initial screen fade in
    Animated.timing(screenFade, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();

    // 2. Logo entrance with spring
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Gentle floating animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(logoFloat, {
            toValue: -6,
            duration: 2200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(logoFloat, {
            toValue: 0,
            duration: 2200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();
    });

    // 3. Subtle Halo Pulses
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(haloScale1, {
            toValue: 1.25,
            duration: 2400,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(haloOpacity1, {
            toValue: 0,
            duration: 2400,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(haloScale1, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(haloOpacity1, { toValue: 0.35, duration: 0, useNativeDriver: true }),
        ]),
      ])
    ).start();

    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(haloScale2, {
              toValue: 1.35,
              duration: 2600,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(haloOpacity2, {
              toValue: 0,
              duration: 2600,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(haloScale2, { toValue: 1, duration: 0, useNativeDriver: true }),
            Animated.timing(haloOpacity2, { toValue: 0.2, duration: 0, useNativeDriver: true }),
          ]),
        ])
      ).start();
    }, 800);

    // 4. Flight & Text Reveal: Starts smoothly at 550ms
    Animated.sequence([
      Animated.delay(550),
      Animated.timing(planeFlight, {
        toValue: 1,
        duration: 2600,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: false,
      }),
    ]).start();

    // 5. Bottom Progress bar entrance and fill
    Animated.timing(bottomOpacity, {
      toValue: 1,
      duration: 500,
      delay: 500,
      useNativeDriver: true,
    }).start();

    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 5100,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: false,
    }).start();
  }, []);

  // Title reveal width (unmasks in exact lockstep as the plane glides across)
  const titleRevealWidth = planeFlight.interpolate({
    inputRange: [0, 0.1, 0.82, 1.0],
    outputRange: [0, 0, TITLE_WIDTH, TITLE_WIDTH],
    extrapolate: 'clamp',
  });

  // Plane flight X position (strictly horizontal from left to right)
  const planeTranslateX = planeFlight.interpolate({
    inputRange: [0, 0.1, 0.82, 1.0],
    outputRange: [-45, -10, TITLE_WIDTH - 10, TITLE_WIDTH + 80],
    extrapolate: 'clamp',
  });

  // Plane opacity (fades in cleanly on left, remains solid 1, then fades as it clears)
  const planeOpacity = planeFlight.interpolate({
    inputRange: [0, 0.06, 0.85, 1.0],
    outputRange: [0, 1, 1, 0],
    extrapolate: 'clamp',
  });

  // Tagline reveals softly right after name is unveiled
  const taglineOpacity = planeFlight.interpolate({
    inputRange: [0, 0.74, 0.94],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  const taglineTranslateY = planeFlight.interpolate({
    inputRange: [0, 0.74, 0.94],
    outputRange: [8, 8, 0],
    extrapolate: 'clamp',
  });

  // Bottom progress width
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, W * 0.72],
  });

  return (
    <Animated.View style={[styles.container, { opacity: screenFade }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" translucent={true} />

      {/* Center Content Section */}
      <View style={styles.centerContent}>
        {/* Logo Container with Golden Halo Rings */}
        <Animated.View
          style={[
            styles.logoWrapper,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }, { translateY: logoFloat }],
            },
          ]}
        >
          {/* Subtle Golden Halo Waves */}
          <Animated.View
            style={[
              styles.haloRing,
              {
                transform: [{ scale: haloScale1 }],
                opacity: haloOpacity1,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.haloRing,
              styles.haloRingSecondary,
              {
                transform: [{ scale: haloScale2 }],
                opacity: haloOpacity2,
              },
            ]}
          />

          {/* Logo Disc */}
          <View style={styles.logoDisc}>
            <Image
              source={require('../../../assets/triptual-logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </Animated.View>

        {/* Brand Title Area with Straight Horizontal Flying Plane Reveal */}
        <View style={styles.brandTitleContainer}>
          {/* Unmasking Window for TRIPTUAL */}
          <Animated.View
            style={[
              styles.brandTitleRevealWindow,
              { width: titleRevealWidth },
            ]}
          >
            <View style={styles.brandTitleInner}>
              <Text style={styles.brandTitle}>TRIPTUAL</Text>
            </View>
          </Animated.View>

          {/* Flying Jet leading the reveal (strictly horizontal movement & orientation) */}
          <Animated.View
            style={[
              styles.flyingPlaneWrapper,
              {
                opacity: planeOpacity,
                transform: [{ translateX: planeTranslateX }],
              },
            ]}
            pointerEvents="none"
          >
            {/* Horizontal Contrail / Jet Stream */}
            <View style={styles.planeContrail} />

            {/* Precision Horizontal Jet */}
            <HorizontalJet size={22} />
          </Animated.View>
        </View>

        {/* Tagline reveals softly right after name is unveiled */}
        <Animated.View
          style={[
            styles.taglineRow,
            {
              opacity: taglineOpacity,
              transform: [{ translateY: taglineTranslateY }],
            },
          ]}
        >
          <View style={styles.goldLine} />
          <Text style={styles.taglineText}>LUXURY TRAVEL & LEDGER</Text>
          <View style={styles.goldLine} />
        </Animated.View>
      </View>

      {/* Bottom Minimal Hairline Progress Bar */}
      <Animated.View style={[styles.bottomSection, { opacity: bottomOpacity }]}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight || 30) + 20,
    paddingBottom: Platform.OS === 'ios' ? 44 : 32,
  },

  /* Center Content */
  centerContent: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrapper: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  haloRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(212, 175, 55, 0.25)',
  },
  haloRingSecondary: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(70, 75, 41, 0.12)',
  },
  logoDisc: {
    width: 124,
    height: 124,
    borderRadius: 62,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2E331B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(212, 175, 55, 0.4)',
  },
  logoImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
  },

  /* Brand Title Container with Flying Plane Reveal */
  brandTitleContainer: {
    width: TITLE_WIDTH,
    height: 52,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  brandTitleRevealWindow: {
    height: 52,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  brandTitleInner: {
    width: TITLE_WIDTH,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2E331B',
    letterSpacing: 7.5,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-medium',
    textAlign: 'center',
  },

  /* Flying Plane & Horizontal Wake */
  flyingPlaneWrapper: {
    position: 'absolute',
    left: 0,
    top: 20, // Lowered to sit lower along the text baseline
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  planeContrail: {
    width: 32,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(212, 175, 55, 0.75)',
    marginRight: -2,
  },

  /* Tagline */
  taglineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  goldLine: {
    width: 24,
    height: 1,
    backgroundColor: 'rgba(212, 175, 55, 0.6)',
  },
  taglineText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#707750',
    letterSpacing: 2.8,
  },

  /* Bottom Progress Section */
  bottomSection: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 10,
  },
  progressTrack: {
    width: W * 0.72,
    height: 3,
    backgroundColor: '#EBE7DD',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#D4AF37',
    borderRadius: 2,
  },
});
