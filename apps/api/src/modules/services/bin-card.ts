export function buildBinCardRows(item: any, movements: any[]) {
  let balance = 0;
  const rows: any[] = [{
    id: `${item.id}-registration`,
    date: item.createdAt,
    reference: "Item registration",
    transactionType: "REGISTRATION",
    itemDescription: item.description,
    source: item.createdBy?.fullName ?? item.createdBy?.email ?? "System",
    destination: item.defaultLocation?.name ?? "N/A",
    provider: "N/A",
    department: "N/A",
    batchNumber: "N/A",
    expiryDate: null,
    unitCost: null,
    totalPrice: 0,
    receivedQuantity: 0,
    issuedQuantity: 0,
    balance,
    remarks: "Item opened in the inventory register."
  }];

  for (const movement of movements) {
    const quantity = Number(movement.quantity);
    const isPendingReceipt = movement.type === "RECEIVE_PENDING_ALLOCATION";
    const balanceDelta = isPendingReceipt ? 0 : quantity;
    balance += balanceDelta;
    const isReceipt = quantity > 0;
    const isIssue = quantity < 0;
    const supplier = movement.grnLine?.grn?.supplierDonor?.name ?? movement.grnLine?.grn?.sourceType;
    const department = movement.voucher?.issueRequest?.department?.name;
    const unitCost = movement.unitCost == null ? null : Number(movement.unitCost);
    const totalPrice = unitCost == null ? null : Math.abs(quantity) * unitCost;
    rows.push({
      id: movement.id,
      date: movement.postedAt,
      reference: movement.grnLine?.grn?.grnNumber ?? movement.voucher?.voucherNumber ?? movement.entryNumber,
      transactionType: movement.type,
      itemDescription: item.description,
      source: isReceipt ? (supplier ?? "Received stock") : (movement.storageLocation?.store?.name ?? "Store"),
      destination: isIssue ? (department ?? "Issuing department") : (movement.storageLocation?.store?.name ?? "Store"),
      provider: supplier ?? "N/A",
      department: department ?? "N/A",
      batchNumber: movement.batchNumber ?? movement.batch?.batchNumber ?? "N/A",
      expiryDate: movement.expiryDate ?? movement.batch?.expiryDate,
      unitCost,
      totalPrice,
      receivedQuantity: isReceipt ? quantity : 0,
      issuedQuantity: isIssue ? Math.abs(quantity) : 0,
      balance,
      location: movement.storageLocation ? `${movement.storageLocation.store?.name ?? "Store"} / Shelf ${movement.storageLocation.shelfNumber ?? movement.shelfCode ?? "N/A"} / Bin ${movement.storageLocation.binNumber ?? movement.binCode ?? "N/A"}` : `Shelf ${movement.shelfCode ?? "N/A"} / Bin ${movement.binCode ?? "N/A"}`,
      actor: movement.actor?.fullName ?? movement.actor?.email ?? "System",
      remarks: movement.notes ?? ""
    });
  }
  return rows;
}
