import React from 'react';
import Column from './Column';

export default function Kanban() {
  return (
    <div className="flex justify-center gap-10 mt-20">
      <Column status="PLANNED" />
      <Column status="ONGOING" />
      <Column status="DONE" />
    </div>
  );
}
