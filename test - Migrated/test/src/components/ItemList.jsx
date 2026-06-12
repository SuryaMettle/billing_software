import React from "react";

function ItemList({ items }) {
  return (
    <table border="1" style={{ marginTop: "20px" }}>
      <thead>
        <tr>
          <th>Item</th>
          <th>Price</th>
          <th>Qty</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, index) => (
          <tr key={index}>
            <td>{item.name}</td>
            <td>₹{item.price}</td>
            <td>{item.qty}</td>
            <td>₹{item.price * item.qty}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default ItemList;