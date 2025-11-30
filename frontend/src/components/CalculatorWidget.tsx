import React, { useState } from "react";

export default function CalculatorWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [display, setDisplay] = useState("0");

  const toggle = () => setIsOpen(!isOpen);

  const handleInput = (val: string) => {
    setDisplay((prev) => (prev === "0" ? val : prev + val));
  };

  const calculate = () => {
    try {
      // eslint-disable-next-line no-eval
      const result = eval(display);
      setDisplay(String(result));
    } catch {
      setDisplay("Error");
    }
  };

  const clear = () => setDisplay("0");

  return (
    <div className="fixed top-1/2 -translate-y-1/2 right-0 z-50 flex items-center">
      {/* Pull Button */}
      <button
        onClick={toggle}
        className={`fixed top-1/2 right-0 -translate-y-1/2 bg-blue-600 text-white px-3 py-2 rounded-l-xl shadow transition-transform duration-1000 transform ${
          isOpen ? '-translate-x-72' : 'translate-x-0'
        }`}
        style={{ marginRight: isOpen ? '16px' : '0' }}
      >
        {isOpen ? "→" : "←"}
      </button>

      {/* Calculator Panel */}
      <div
        className={`fixed top-1/2 right-0 -translate-y-1/2 w-72 bg-white shadow-xl border-l p-4 rounded-l-xl transition-transform duration-300 transform ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="text-right mb-4 text-2xl text-black font-mono border p-2 rounded bg-gray-100">
          {display}
        </div>

        <div className="grid grid-cols-4 gap-2">
          {["7", "8", "9", "/", "4", "5", "6", "*", "1", "2", "3", "-", "0", ".", "=", "+"].map(
            (key) => (
              <button
                key={key}
                onClick={() => (key === "=" ? calculate() : handleInput(key))}
                className="p-4 bg-gray-200 hover:bg-gray-300 rounded text-xl"
              >
                {key}
              </button>
            )
          )}
        </div>

        <button
          onClick={clear}
          className="mt-3 w-full bg-red-500 text-white py-2 rounded"
        >
          Clear
        </button>
      </div>
    </div>
  );
}