from rest_framework.pagination import CursorPagination


class StandardCursorPagination(CursorPagination):
    """
    Standard pagination for infinite scroll interfaces.
    """

    page_size = 10
    max_page_size = 50
    ordering = "-created_at"  # Default ordering
