import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface CrudListParams {
  page: number;
  pageSize: number;
  filter?: string;
  search?: string;
}

export interface CrudListResult<TData> {
  data: TData[];
  total: number;
}

export interface CrudMutationDef<TInput, TUpdateInput = TInput> {
  create?: {
    mutationFn: (input: TInput) => Promise<unknown>;
    successMessage?: string;
  };
  update?: {
    mutationFn: (args: { id: string; input: TUpdateInput }) => Promise<unknown>;
    successMessage?: string;
  };
  delete?: {
    mutationFn: (id: string) => Promise<unknown>;
    successMessage?: string;
  };
}

export interface UseCrudManagerConfig<TData, TInput, TUpdateInput = TInput>
  extends CrudMutationDef<TInput, TUpdateInput> {
  queryKey: string[];
  queryFn: (params: CrudListParams) => Promise<CrudListResult<TData>>;
  pageSize?: number;
  initialFilter?: string;
  additionalInvalidateKeys?: string[][];
  resetForm?: () => void;
}

export function useCrudManager<TData, TInput, TUpdateInput = TInput>(
  config: UseCrudManagerConfig<TData, TInput, TUpdateInput>,
) {
  const {
    queryKey,
    queryFn,
    pageSize = 15,
    initialFilter = "all",
    additionalInvalidateKeys = [],
    create,
    update,
    delete: del,
  } = config;

  const resetFormRef = useRef(config.resetForm);
  resetFormRef.current = config.resetForm;

  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState(initialFilter);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: [...queryKey, page, filter, search],
    queryFn: () =>
      queryFn({
        page,
        pageSize,
        filter: filter !== "all" ? filter : undefined,
        search: search || undefined,
      }),
    staleTime: 30_000,
  });

  const data = (query.data?.data ?? []) as TData[];
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const invalidate = useCallback(
    (extraKeys?: string[][]) => {
      queryClient.invalidateQueries({ queryKey });
      for (const keys of [
        ...additionalInvalidateKeys,
        ...(extraKeys ?? []),
      ]) {
        queryClient.invalidateQueries({ queryKey: keys });
      }
    },
    [queryClient, queryKey, additionalInvalidateKeys],
  );

  const mode: "create" | "edit" = editingId ? "edit" : "create";

  const openCreateForm = useCallback(() => {
    setEditingId(null);
    setShowForm(true);
  }, []);

  const openEditForm = useCallback((id: string) => {
    setEditingId(id);
    setShowForm(true);
  }, []);

  const closeForm = useCallback(() => {
    setShowForm(false);
    setEditingId(null);
    resetFormRef.current?.();
  }, []);

  const confirmDelete = useCallback((id: string) => {
    setDeletingId(id);
  }, []);

  const cancelDelete = useCallback(() => {
    setDeletingId(null);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleFilterChange = useCallback((newFilter: string) => {
    setFilter(newFilter);
    setPage(1);
  }, []);

  const handleSearchChange = useCallback((newSearch: string) => {
    setSearch(newSearch);
    setPage(1);
  }, []);

  const createMutation = create
    ? useMutation({
        mutationFn: create.mutationFn,
        onSuccess: () => {
          invalidate();
          toast.success(create.successMessage ?? "Created successfully");
          closeForm();
        },
        onError: (e: Error) => toast.error(e.message),
      })
    : null;

  const updateMutation = update
    ? useMutation({
        mutationFn: update.mutationFn,
        onSuccess: () => {
          invalidate();
          toast.success(update.successMessage ?? "Updated successfully");
          closeForm();
        },
        onError: (e: Error) => toast.error(e.message),
      })
    : null;

  const deleteMutation = del
    ? useMutation({
        mutationFn: del.mutationFn,
        onSuccess: () => {
          invalidate();
          toast.success(del.successMessage ?? "Deleted successfully");
          cancelDelete();
        },
        onError: (e: Error) => {
          toast.error(e.message);
          cancelDelete();
        },
      })
    : null;

  const isPending =
    (createMutation?.isPending ?? false) ||
    (updateMutation?.isPending ?? false) ||
    (deleteMutation?.isPending ?? false);

  return {
    query,
    data,
    total,
    totalPages,
    isLoading: query.isLoading,
    refetch: query.refetch,
    page,
    setPage: handlePageChange,
    filter,
    setFilter: handleFilterChange,
    search,
    setSearch: handleSearchChange,
    showForm,
    editingId,
    mode,
    openCreateForm,
    openEditForm,
    closeForm,
    deletingId,
    confirmDelete,
    cancelDelete,
    queryClient,
    invalidate,
    createMutation,
    updateMutation,
    deleteMutation,
    isPending,
  };
}
