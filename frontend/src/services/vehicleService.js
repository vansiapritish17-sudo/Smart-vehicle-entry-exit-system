export function searchVehicles(vehicles, filters) {
  const reg = filters.regNo?.replace(/[\s-]/g, "").toLowerCase() || "";
  const owner = filters.owner?.trim().toLowerCase() || "";
  return vehicles.filter((vehicle) => {
    const matchesReg = !reg || vehicle.regNo?.toLowerCase().includes(reg);
    const matchesOwner = !owner || vehicle.owner?.toLowerCase().includes(owner);
    const matchesStatus = !filters.currentStatus || vehicle.currentStatus === filters.currentStatus;
    const matchesRegistration = !filters.registrationStatus || vehicle.registrationStatus === filters.registrationStatus;
    return matchesReg && matchesOwner && matchesStatus && matchesRegistration;
  });
}
