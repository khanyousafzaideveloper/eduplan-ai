export const INSTITUTES = [
  { id: "1", name: "Army Public School (APS)", type: "School" },
  { id: "2", name: "Beaconhouse School System", type: "School" },
  { id: "3", name: "The City School", type: "School" },
  { id: "4", name: "Roots Millennium Schools", type: "School" },
  { id: "5", name: "Lahore Grammar School (LGS)", type: "School" },
  { id: "6", name: "Government College University (GCU)", type: "College" },
  { id: "7", name: "Punjab Group of Colleges (PGC)", type: "College" },
  { id: "8", name: "KIPS College", type: "College" },
  { id: "9", name: "Aga Khan Higher Secondary School", type: "College" },
  { id: "10", name: "Forebel's International School", type: "School" },
  { id: "other", name: "Other / Not Listed", type: "Other" }
];

export const getInstituteName = (name: string) => {
  const inst = INSTITUTES.find(i => i.name === name);
  return inst ? inst.name : name;
};
