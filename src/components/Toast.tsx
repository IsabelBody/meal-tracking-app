/**
 * Toast Component
 * 
 * Displays toast notifications with animated entry/exit.
 * Renders at the top of the screen with support for different types.
 */

import { AlertCircle, CheckCircle, Info, X, AlertTriangle } from '@tamagui/lucide-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, XStack, YStack } from 'tamagui';

import { Toast as ToastType, ToastType as ToastVariant, useToast } from '../contexts/toast';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface ToastColors {
  background: string;
  border: string;
  text: string;
  icon: string;
}

const TOAST_COLORS: Record<ToastVariant, ToastColors> = {
  success: {
    background: '#ECFDF5',
    border: '#10B981',
    text: '#065F46',
    icon: '#10B981',
  },
  error: {
    background: '#FEF2F2',
    border: '#EF4444',
    text: '#991B1B',
    icon: '#EF4444',
  },
  warning: {
    background: '#FFFBEB',
    border: '#F59E0B',
    text: '#92400E',
    icon: '#F59E0B',
  },
  info: {
    background: '#EFF6FF',
    border: '#3B82F6',
    text: '#1E40AF',
    icon: '#3B82F6',
  },
};

const TOAST_ICONS: Record<ToastVariant, React.ComponentType<any>> = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

interface ToastItemProps {
  toast: ToastType;
  onDismiss: () => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const colors = TOAST_COLORS[toast.type];
  const Icon = TOAST_ICONS[toast.type];

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleDismiss = () => {
    // Animate out
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  return (
    <Animated.View
      style={[
        styles.toastItem,
        {
          backgroundColor: colors.background,
          borderLeftColor: colors.border,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <XStack flex={1} alignItems="flex-start" gap="$2">
        <Icon size={20} color={colors.icon} style={{ marginTop: 2 }} />
        <YStack flex={1} gap="$1">
          {toast.title && (
            <Text
              fontWeight="600"
              fontSize="$3"
              color={colors.text}
            >
              {toast.title}
            </Text>
          )}
          <Text
            fontSize="$3"
            color={colors.text}
            opacity={toast.title ? 0.9 : 1}
          >
            {toast.message}
          </Text>
          {toast.action && (
            <Pressable onPress={toast.action.onPress}>
              <Text
                fontSize="$3"
                fontWeight="600"
                color={colors.icon}
                textDecorationLine="underline"
                marginTop="$1"
              >
                {toast.action.label}
              </Text>
            </Pressable>
          )}
        </YStack>
        <Pressable
          onPress={handleDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.closeButton}
        >
          <X size={18} color={colors.text} opacity={0.6} />
        </Pressable>
      </XStack>
    </Animated.View>
  );
}

/**
 * Toast container component - renders all active toasts
 */
export function ToastContainer() {
  const { toasts, hideToast } = useToast();
  const insets = useSafeAreaInsets();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <YStack
      position="absolute"
      top={insets.top + 10}
      left={0}
      right={0}
      alignItems="center"
      pointerEvents="box-none"
      zIndex={9999}
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={() => hideToast(toast.id)}
        />
      ))}
    </YStack>
  );
}

const styles = StyleSheet.create({
  toastItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: SCREEN_WIDTH - 32,
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
});

export default ToastContainer;
