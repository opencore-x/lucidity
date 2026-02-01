import * as React from 'react';
import { Platform, Pressable, Modal, View } from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  value: Date | undefined;
  onChange: (date: Date | null) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  height?: number;
}

export function DatePicker({
  value,
  onChange,
  minimumDate,
  maximumDate,
  placeholder = 'Select date',
  className,
  disabled,
  height,
}: DatePickerProps) {
  const [show, setShow] = React.useState(false);
  const [tempDate, setTempDate] = React.useState<Date>(value || new Date());

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShow(false);
      if (event.type === 'set' && selectedDate) {
        onChange(selectedDate);
      }
    } else {
      if (selectedDate) {
        setTempDate(selectedDate);
      }
    }
  };

  const handleConfirm = () => {
    onChange(tempDate);
    setShow(false);
  };

  const handleCancel = () => {
    setTempDate(value || new Date());
    setShow(false);
  };

  const handleClear = () => {
    onChange(null);
    setShow(false);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <>
      <Pressable
        onPress={() => !disabled && setShow(true)}
        className={cn(
          'flex-row items-center justify-between',
          disabled && 'opacity-50',
          className
        )}
        style={height ? { height } : undefined}
        disabled={disabled}
      >
        <Text className={cn(value ? 'text-muted-foreground' : 'text-muted-foreground')}>
          {value ? formatDate(value) : placeholder}
        </Text>
      </Pressable>

      {Platform.OS === 'ios' ? (
        <Modal
          visible={show}
          transparent
          animationType="slide"
          onRequestClose={handleCancel}
        >
          <View className="flex-1 justify-end bg-black/50">
            <View className="bg-card rounded-t-xl">
              <View className="flex-row justify-between items-center px-4 py-3 border-b border-border">
                <Button variant="ghost" onPress={handleCancel}>
                  <Text className="text-muted-foreground">Cancel</Text>
                </Button>
                <Button variant="ghost" onPress={handleClear}>
                  <Text className="text-destructive">Clear</Text>
                </Button>
                <Button variant="ghost" onPress={handleConfirm}>
                  <Text className="text-primary font-semibold">Done</Text>
                </Button>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={handleChange}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                style={{ height: 200 }}
              />
            </View>
          </View>
        </Modal>
      ) : (
        show && (
          <DateTimePicker
            value={value || new Date()}
            mode="date"
            display="default"
            onChange={handleChange}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
          />
        )
      )}
    </>
  );
}
