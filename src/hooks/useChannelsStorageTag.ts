import useKVStorage from './useKVStorage';

const KEY = 'channels-storage-tag';

const useStorageTag = () => {
  const [value, setValue, { loading }] = useKVStorage(KEY, '');
  console.log('Ready storage tag value:', value);
  return {
    value: value || undefined,
    set: setValue,
    loading
  };
};

export default useStorageTag;
