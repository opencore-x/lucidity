import React from 'react';
import Column from './Column';

export default function Kanban() {
  return (
    <>
      <h1>Kanban</h1>
      <div className="flex justify-center gap-10">
        <Column status="PLANNED" />
        <Column status="ONGOING" />
        <Column status="DONE" />
      </div>
    </>
  );
}
