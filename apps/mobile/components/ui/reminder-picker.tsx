import * as React from 'react';
import { Platform, Pressable, Modal, View } from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ReminderPickerProps {
  value: Date | undefined;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  className?: string;
  height?: number;
}

function formatDateTime(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function ReminderPicker({
  value,
  onChange,
  placeholder = 'None',
  className,
  height,
}: ReminderPickerProps) {
  const [show, setShow] = React.useState(false);
  const [tempDate, setTempDate] = React.useState<Date>(value || new Date());
  const [androidStep, setAndroidStep] = React.useState<'date' | 'time'>('date');
  const [androidDate, setAndroidDate] = React.useState<Date>(new Date());

  const handlePress = () => {
    setTempDate(value || new Date());
    if (Platform.OS === 'android') {
      setAndroidStep('date');
      setAndroidDate(value || new Date());
    }
    setShow(true);
  };

  const handleClear = () => {
    onChange(null);
    setShow(false);
  };

  const handleIOSChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) setTempDate(selectedDate);
  };

  const handleIOSConfirm = () => {
    onChange(tempDate);
    setShow(false);
  };

  const handleIOSCancel = () => {
    setTempDate(value || new Date());
    setShow(false);
  };

  const handleAndroidChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
      setShow(false);
      return;
    }
    if (!selectedDate) return;

    if (androidStep === 'date') {
      setAndroidDate(selectedDate);
      setAndroidStep('time');
    } else {
      const combined = new Date(androidDate);
      combined.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
      onChange(combined);
      setShow(false);
    }
  };

  return (
    <>
      <Pressable
        onPress={handlePress}
        className={cn('flex-row items-center justify-between', className)}
        style={height ? { height } : undefined}
      >
        <Text className="text-muted-foreground">
          {value ? formatDateTime(value) : placeholder}
        </Text>
      </Pressable>

      {Platform.OS === 'ios' ? (
        <Modal
          visible={show}
          transparent
          animationType="slide"
          onRequestClose={handleIOSCancel}
        >
          <View className="flex-1 justify-end bg-black/50">
            <View className="bg-card rounded-t-xl">
              <View className="flex-row justify-between items-center px-4 py-3 border-b border-border">
                <Button variant="ghost" onPress={handleIOSCancel}>
                  <Text className="text-muted-foreground">Cancel</Text>
                </Button>
                <Button variant="ghost" onPress={handleClear}>
                  <Text className="text-destructive">Clear</Text>
                </Button>
                <Button variant="ghost" onPress={handleIOSConfirm}>
                  <Text className="text-primary font-semibold">Done</Text>
                </Button>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="datetime"
                display="spinner"
                onChange={handleIOSChange}
                minimumDate={new Date()}
                style={{ height: 200 }}
              />
            </View>
          </View>
        </Modal>
      ) : (
        show && (
          <DateTimePicker
            value={androidDate}
            mode={androidStep}
            display="default"
            onChange={handleAndroidChange}
            minimumDate={androidStep === 'date' ? new Date() : undefined}
          />
        )
      )}
    </>
  );
}
