// Add the element e to the tail of the list.
export function push(list, e) {
  if (e.previous = list.tail) list.tail.next = e;
  else list.head = e;
  list.tail = e;
}

// Remove the head of the list.
export function pop(list) {
  var e0 = list.head, e1;
  if (e0) {
    if (e1 = e0.next) e0.next = null, e1.previous = null;
    else list.tail = null;
    list.head = e1;
  }
  return e0;
}

// Remove the element e from the given list.
export function remove(list, e) {
  var e0 = e.previous, e1 = e.next;
  if (e0) e0.next = e1; else list.head = e1;
  if (e1) e1.previous = e0; else list.tail = e0;
}
