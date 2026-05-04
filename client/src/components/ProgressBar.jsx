import React from "react";

export default function ProgressBar({ value }) {
  return <div className="progress"><span style={{ width: `${value || 0}%` }} /></div>;
}
