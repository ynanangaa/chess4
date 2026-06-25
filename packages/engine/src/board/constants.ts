// The board is a 14x14 grid with 36 squares excluded, resulting in a total of 160 valid squares.
// The excluded squares are every cartesian product of the sets {a,b,c,l,m,n} x {1,2,3,12,13,14}.
export const INVALID_SQUARES = new Set([
  'a1', 'a2', 'a3', 'a12', 'a13', 'a14',
  'b1', 'b2', 'b3', 'b12', 'b13', 'b14',
  'c1', 'c2', 'c3', 'c12', 'c13', 'c14',
  'l1', 'l2', 'l3', 'l12', 'l13', 'l14',
  'm1', 'm2', 'm3', 'm12', 'm13', 'm14',
  'n1', 'n2', 'n3', 'n12', 'n13', 'n14'
]);