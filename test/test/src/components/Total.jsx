import React from "react";

function Total({ items }) {
  const total = items.reduce(
    (sum, item) => sum + item.price * item.qty,
    0
  );

  return <h2>Total: ₹{total}</h2>;
}

export default Total;