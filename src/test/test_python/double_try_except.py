test_var = 0
try:
    test_var = 1+1
    try:
        1/0
    except:
        try:
            1/0
        except:
            try:
                1/0
            except:
                print('hello')
except:
    test_var = '3+3'
