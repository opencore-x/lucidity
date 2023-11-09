import React from 'react';
import Column from './Column';

export default function Kanban() {
  return (
    <div className="flex justify-center p-6 gap-10 h-screen mt-20">
      <Column status="PLANNED" />
      <Column status="ONGOING" />
      <Column status="DONE" />
    </div>
  );
}
